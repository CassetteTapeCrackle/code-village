"""The loaded content, typed. Loading never runs code; checks read this model."""

import hashlib
from collections.abc import Iterable, Iterator
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

Meta = dict[str, object]


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
    return any(part.startswith(".") or part == "__pycache__" for part in path.parts)


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


@dataclass(frozen=True)
class TaskBlock:
    task: Task


Block = TextBlock | CodeBlock | TaskBlock


@dataclass(frozen=True)
class Lesson:
    where: str
    path: Path
    meta: Meta
    blocks: tuple[Block, ...]
    fingerprint: str

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
    fingerprint: str


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


@dataclass(frozen=True)
class Content:
    root: Path
    worlds: tuple[World, ...]
    lessons: tuple[Lesson, ...]
    bosses: tuple[Boss, ...]
    concepts: dict[str, str]

    @property
    def tasks(self) -> list[Task]:
        return [task for lesson in self.lessons for task in lesson.tasks]

    def items(self) -> Iterator[Item]:
        for task in self.tasks:
            yield Item(task.id, "task", "the solution", task.folder, task.starter, task.solution, task.tests,
                       task.strict, task.fingerprint)
            for v in task.variants:
                yield Item(v.id, "variant", "the solution", v.folder, v.starter, v.solution, v.tests, v.strict,
                           v.fingerprint)
        for boss in self.bosses:
            for stage in boss.stages:
                yield Item(boss.id, "stage", f"the solution (stage {stage.id})", boss.folder, boss.starter,
                           boss.solution, stage.tests, False, boss.fingerprint)
            yield Item(boss.id, "hard", "the solution (hard mode)", boss.folder, boss.starter, boss.solution,
                       boss.hard_tests, False, boss.fingerprint)
