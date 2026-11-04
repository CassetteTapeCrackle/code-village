"""The loaded content, typed. Loading never runs code; checks read this model."""

import hashlib
from collections.abc import Iterable, Iterator
from dataclasses import dataclass, replace
from pathlib import Path
from typing import Literal

from .adapter import Required
from .ledger import LedgerEntry

Meta = dict[str, object]
LEDGER_FILE = "ledger.toml"  # reviews of sentences, not content: editing it must not re-pin the item's gaps


def fingerprint_bytes(parts: Iterable[bytes]) -> str:
    """sha256 over the parts, first 12 hex digits: what a gap entry is pinned to."""
    digest = hashlib.sha256()
    for part in parts:
        digest.update(part + b"\0")
    return digest.hexdigest()[:12]


def fingerprint_files(folder: Path, extra: str = "") -> str:
    """Every file under folder (path and bytes), plus extra text such as the lesson the item sits in.

    Dot files (.DS_Store, editor swap files) and caches are skipped: they exist on one machine and not on CI.
    """
    files = sorted(p for p in folder.rglob("*") if p.is_file() and not _local_only(p.relative_to(folder)))
    return fingerprint_bytes([*(str(p.relative_to(folder)).encode() + b"\0" + p.read_bytes() for p in files),
                              extra.encode()])


def _local_only(path: Path) -> bool:
    return path.name == LEDGER_FILE or any(part.startswith(".") or part == "__pycache__" for part in path.parts)


def fingerprint_text(text: str) -> str:
    return fingerprint_bytes([text.encode()])


@dataclass(frozen=True)
class Variant:
    id: str
    where: str
    folder: Path
    meta: Meta
    starter: str
    solution: str
    tests: str
    strict: bool
    wrong: tuple[Path, ...]
    right: tuple[Path, ...]
    fingerprint: str


@dataclass(frozen=True)
class Task:
    id: str
    where: str
    folder: Path
    meta: Meta
    starter: str
    solution: str
    tests: str
    strict: bool
    hints: tuple[object, ...]
    wrong: tuple[Path, ...]
    right: tuple[Path, ...]
    variants: tuple[Variant, ...]
    fingerprint: str


@dataclass(frozen=True)
class TextBlock:
    markdown: str


CodeKind = Literal["example", "predict", "claim"]


@dataclass(frozen=True)
class CodeBlock:
    kind: CodeKind
    code: str
    min: str | None = None  # the oldest Python it holds on (fence attribute min=3.13); None means 3.12, the oldest
    id: str | None = None  # a claim's id (fence attribute id=...), which a ledger entry points to


@dataclass(frozen=True)
class TaskBlock:
    task: Task


Block = TextBlock | CodeBlock | TaskBlock


@dataclass(frozen=True)
class Feature:
    """Something code can use and a lesson can teach, with the detectors that find it (content/features.toml)."""

    id: str
    summary: str
    detect: tuple[str, ...]
    words: tuple[str, ...]  # how a prompt names it, for the checks on required constructs
    say: str  # what Check tells the learner to do when a task requires it: "put @property above the method"


@dataclass(frozen=True)
class Lesson:
    where: str
    path: Path
    meta: Meta
    blocks: tuple[Block, ...]
    fingerprint: str
    ledger: tuple[LedgerEntry, ...] = ()

    @property
    def teaches(self) -> tuple[str, ...] | None:
        """The feature ids the lesson declares, None when it declares none."""
        teaches = self.meta.get("teaches")
        return tuple(str(f) for f in teaches) if isinstance(teaches, list) else None

    @property
    def tasks(self) -> list[Task]:
        return [b.task for b in self.blocks if isinstance(b, TaskBlock)]


@dataclass(frozen=True)
class Stage:
    id: str
    where: str
    meta: Meta
    tests: str


@dataclass(frozen=True)
class Boss:
    id: str
    where: str
    folder: Path
    meta: Meta
    intro: str
    starter: str
    solution: str
    hard_tests: str
    stages: tuple[Stage, ...]
    wrong: tuple[Path, ...]
    right: tuple[Path, ...]
    fingerprint: str
    ledger: tuple[LedgerEntry, ...] = ()


@dataclass(frozen=True)
class World:
    id: str
    where: str
    path: Path
    meta: Meta
    fingerprint: str


ItemKind = Literal["task", "variant", "stage", "hard"]


@dataclass(frozen=True)
class Item:
    """One solution with one test suite: a task, a variant, a boss stage or a boss's hard tests."""

    id: str
    kind: ItemKind
    label: str  # how messages name the solution, "the solution (stage calc-sub)" for a boss stage
    folder: Path
    starter: str
    solution: str
    tests: str
    strict: bool
    fingerprint: str
    seed: str  # the item's own id, which seeds its hidden inputs: the stage id for a stage, "<boss>:hard"
    cases: object  # the raw [cases] table, None when the item declares none
    right: tuple[Path, ...]  # correct answers written another way, which must pass like the solution
    wrong: tuple[Path, ...]  # mistakes a learner could make, which must fail
    prompt: str  # what the learner reads: the task, variant or stage prompt, the boss intro for hard mode
    min: str | None  # the oldest Python the item holds on (`min` in its TOML or the boss front matter)
    requires_ids: tuple[str, ...] = ()  # feature ids the task requires (`requires` in its TOML), as declared
    requires: tuple[Required, ...] = ()  # the same, for the listed features, as Check reads them
    words_ok: str | None = None  # why the prompt may name a construct without requiring it (`construct_words_ok`)


def _min(meta: Meta) -> str | None:
    value = meta.get("min")
    return value if isinstance(value, str) else None


@dataclass(frozen=True)
class Content:
    root: Path
    worlds: tuple[World, ...]
    lessons: tuple[Lesson, ...]
    bosses: tuple[Boss, ...]
    concepts: dict[str, str]
    features: dict[str, Feature]

    @property
    def vocabulary(self) -> dict[str, list[str]]:
        """Feature id to detectors, as the harness reads it."""
        return {feature.id: list(feature.detect) for feature in self.features.values()}

    @property
    def tasks(self) -> list[Task]:
        return [task for lesson in self.lessons for task in lesson.tasks]

    def items(self) -> Iterator[Item]:
        for task in self.tasks:
            yield self._item(task.meta, Item(task.id, "task", "the solution", task.folder, task.starter, task.solution,
                                             task.tests, task.strict, task.fingerprint, task.id,
                                             task.meta.get("cases"), task.right, task.wrong,
                                             str(task.meta.get("prompt", "")), _min(task.meta)))
            for v in task.variants:
                yield self._item(v.meta, Item(v.id, "variant", "the solution", v.folder, v.starter, v.solution,
                                              v.tests, v.strict, v.fingerprint, v.id, v.meta.get("cases"), v.right,
                                              v.wrong, str(v.meta.get("prompt", "")), _min(v.meta)))
        for boss in self.bosses:
            for stage in boss.stages:
                yield self._item(stage.meta, Item(boss.id, "stage", f"the solution (stage {stage.id})", boss.folder,
                                                  boss.starter, boss.solution, stage.tests, False, boss.fingerprint,
                                                  stage.id, stage.meta.get("cases"), boss.right, boss.wrong,
                                                  str(stage.meta.get("prompt", "")), _min(boss.meta)))
            yield self._item(boss.meta, Item(boss.id, "hard", "the solution (hard mode)", boss.folder, boss.starter,
                                             boss.solution, boss.hard_tests, False, boss.fingerprint,
                                             f"{boss.id}:hard", boss.meta.get("cases"), boss.right, boss.wrong,
                                             boss.intro, _min(boss.meta)))

    def _item(self, meta: Meta, item: Item) -> Item:
        """The item with what its TOML (or a boss's front matter, for hard mode) says it requires."""
        declared = meta.get("requires")
        ids = tuple(str(i) for i in declared) if isinstance(declared, list) else ()
        known = [self.features[i] for i in ids if i in self.features]
        words_ok = meta.get("construct_words_ok")
        return replace(item, requires_ids=ids, requires=tuple(Required(f.id, f.detect, f.say) for f in known),
                       words_ok=words_ok if isinstance(words_ok, str) else None)

    def solution_groups(self) -> list[list[Item]]:
        """Items that share one model solution: a task or variant alone, a boss's stages with its hard mode."""
        groups: dict[tuple[str, str], list[Item]] = {}
        for item in self.items():
            groups.setdefault((item.id, item.solution), []).append(item)
        return list(groups.values())
