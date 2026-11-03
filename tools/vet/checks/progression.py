"""Rules untaught-feature, unknown-feature and teaches-missing: nothing is used before it is taught (spec 13).

Each lesson declares the features it teaches. The code a learner reads or writes (examples, predicts, starters,
solutions, wrong/ and right/ answers, code in hints, a boss's files) may use only what that lesson or an earlier
one teaches. Lessons run in world order, then lesson order; a boss comes after the last lesson of its region.
"""

import ast
from collections.abc import Iterable, Sequence
from dataclasses import dataclass
from pathlib import Path

from ..adapter import FeatureQuery, LanguageAdapter
from ..finding import Finding, Subject, subject
from ..model import Boss, CodeBlock, Content, Lesson, Task, Variant
from .hints import HINT_CODE, looks_like_code

UNKNOWN = "unknown:"
LAST = 10**9  # sorts a lesson whose world has no order after the rest


@dataclass(frozen=True)
class Source:
    """One piece of code a learner reads or writes, named the way a finding names it."""

    name: str
    code: str


@dataclass(frozen=True)
class Unit:
    """Sources that share a finding: a lesson's text, a task or variant, a boss. `taught_by` is how many lessons of
    the order (from the first) have been taught when the unit's code is met."""

    about: Subject
    sources: tuple[Source, ...]
    taught_by: int


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    order = lesson_order(content)
    yield from _teaches_findings(content, order)
    units = list(_units(content, order))
    queries = [FeatureQuery(s.code, own) for unit, own in units for s in unit.sources]
    found = iter(adapter.features(queries, content.vocabulary))
    judged = judged_count(order)
    first_taught = _first_taught(order)
    for unit, _ in units:
        features = _by_name((s.name, next(found)) for s in unit.sources)
        yield from _unknown(unit, features)
        if unit.taught_by <= judged:
            yield from _untaught(unit, features, order, first_taught)


def lesson_order(content: Content) -> list[Lesson]:
    world_order = {w.id: w.meta.get("order") for w in content.worlds}

    def key(lesson: Lesson) -> tuple[int, int]:
        world, position = world_order.get(str(lesson.meta.get("world"))), lesson.meta.get("order")
        return (world if isinstance(world, int) else LAST, position if isinstance(position, int) else LAST)

    return sorted(content.lessons, key=key)


def judged_count(order: Sequence[Lesson]) -> int:
    """How many lessons from the start all declare `teaches`: the code up to there can be judged."""
    for count, lesson in enumerate(order):
        if lesson.teaches is None:
            return count
    return len(order)


def taught_at(order: Sequence[Lesson], position: int) -> set[str]:
    """The feature ids taught by the first `position` lessons of the order."""
    return {feature for lesson in order[:position] for feature in lesson.teaches or ()}


def item_positions(content: Content, order: Sequence[Lesson]) -> dict[str, int]:
    """For each task, variant and boss id: how many lessons are taught when a learner meets it."""
    positions: dict[str, int] = {}
    for position, lesson in enumerate(order, start=1):
        for task in lesson.tasks:
            positions.update({task.id: position, **{v.id: position for v in task.variants}})
    for boss in content.bosses:
        after = after_region(order, boss)
        if after is not None:
            positions[boss.id] = after
    return positions


def _first_taught(order: Sequence[Lesson]) -> dict[str, Lesson]:
    first: dict[str, Lesson] = {}
    for lesson in order:
        for feature in lesson.teaches or ():
            first.setdefault(feature, lesson)
    return first


def _teaches_findings(content: Content, order: Sequence[Lesson]) -> Iterable[Finding]:
    for lesson in order:
        about = subject(str(lesson.meta.get("id")), lesson.fingerprint, lesson.path, content.root)
        if lesson.teaches is None:
            yield about.finding("teaches-missing", "add `teaches = [...]` to the front matter: the feature ids "
                                                   "from content/features.toml this lesson introduces")
            continue
        unknown = sorted(set(lesson.teaches) - content.features.keys())
        if unknown:
            yield about.finding("unknown-feature", f"teaches names {', '.join(unknown)}, which "
                                                   "content/features.toml does not list")


def _units(content: Content, order: Sequence[Lesson]) -> Iterable[tuple[Unit, tuple[str, ...]]]:
    """Every unit with the names its code defines itself (a method called from another snippet is not a feature)."""
    for position, lesson in enumerate(order, start=1):
        own = tuple(sorted(_defined_names(lesson)))
        about = subject(str(lesson.meta.get("id")), lesson.fingerprint, lesson.path, content.root)
        text = tuple(Source(b.kind, b.code) for b in lesson.blocks if isinstance(b, CodeBlock) and b.kind != "claim")
        yield Unit(about, text, position), own
        for task in lesson.tasks:
            yield from _task_units(task, position, own, content.root)
    for boss in content.bosses:
        taught_by = after_region(order, boss)
        if taught_by is not None:
            about = subject(boss.id, boss.fingerprint, boss.folder / "boss.md", content.root)
            sources = _answers(boss.starter, boss.solution, boss.wrong, boss.right, boss.folder)
            yield Unit(about, sources, taught_by), tuple(sorted(_defined_names_in([boss.starter, boss.solution])))


def _task_units(task: Task, position: int, own: tuple[str, ...],
                root: Path) -> Iterable[tuple[Unit, tuple[str, ...]]]:
    about = subject(task.id, task.fingerprint, task.folder / "task.toml", root)
    sources = (*_answers(task.starter, task.solution, task.wrong, task.right, task.folder), *_hint_code(task))
    yield Unit(about, sources, position), own
    for variant in task.variants:
        yield _variant_unit(variant, position, root), own


def _variant_unit(variant: Variant, position: int, root: Path) -> Unit:
    about = subject(variant.id, variant.fingerprint, variant.folder / "variant.toml", root)
    return Unit(about, _answers(variant.starter, variant.solution, variant.wrong, variant.right, variant.folder),
                position)


def _answers(starter: str, solution: str, wrong: Iterable[Path], right: Iterable[Path],
             folder: Path) -> tuple[Source, ...]:
    return (Source("starter.py", starter), Source("solution.py", solution),
            *(Source(str(p.relative_to(folder)), p.read_text()) for p in (*wrong, *right)))


def _hint_code(task: Task) -> Iterable[Source]:
    """Code spans in hints that parse on their own.
    shortcut: a half statement in backticks (`for x in`) is skipped, upgrade to the wraps in checks/hints.py if
    hints start to teach through fragments."""
    for number, hint in enumerate(task.hints, start=1):
        for span in HINT_CODE.findall(hint if isinstance(hint, str) else ""):
            if looks_like_code(span):
                yield Source(f"hint {number}", span)


def after_region(order: Sequence[Lesson], boss: Boss) -> int | None:
    """How many lessons come up to the last one of the boss's region; None for a region with no lessons."""
    in_region = [i for i, lesson in enumerate(order, start=1)
                 if (lesson.meta.get("world"), lesson.meta.get("region")) == (boss.meta.get("world"),
                                                                              boss.meta.get("region"))]
    return max(in_region, default=None)


def _defined_names(lesson: Lesson) -> set[str]:
    codes = [b.code for b in lesson.blocks if isinstance(b, CodeBlock)]
    for task in lesson.tasks:
        codes += [task.starter, task.solution, *(p.read_text() for p in (*task.wrong, *task.right))]
        for variant in task.variants:
            codes += [variant.starter, variant.solution]
    return _defined_names_in(codes)


def _defined_names_in(codes: Iterable[str]) -> set[str]:
    names: set[str] = set()
    for code in codes:
        try:
            tree = ast.parse(code)
        except SyntaxError:
            continue
        names.update(n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef | ast.ClassDef))
    return names


def _by_name(pairs: Iterable[tuple[str, frozenset[str]]]) -> dict[str, set[str]]:
    """The features of each named source; sources with one name (several examples) are merged."""
    merged: dict[str, set[str]] = {}
    for name, found in pairs:
        merged.setdefault(name, set()).update(found)
    return merged


def _unknown(unit: Unit, features: dict[str, set[str]]) -> Iterable[Finding]:
    unlisted = {name: sorted(f.removeprefix(UNKNOWN) for f in found if f.startswith(UNKNOWN))
                for name, found in features.items()}
    parts = [f"{name} uses {', '.join(detectors)}" for name, detectors in unlisted.items() if detectors]
    if parts:
        yield unit.about.finding("unknown-feature", f"{'; '.join(parts)}: add each to content/features.toml")


def _untaught(unit: Unit, features: dict[str, set[str]], order: Sequence[Lesson],
              first_taught: dict[str, Lesson]) -> Iterable[Finding]:
    taught = taught_at(order, unit.taught_by)
    used: dict[str, list[str]] = {}
    for name, found in features.items():
        for feature in sorted(found - taught):
            if not feature.startswith(UNKNOWN):
                used.setdefault(feature, []).append(name)
    if not used:
        return
    parts = [f"{feature} in {', '.join(names)} ({_who_teaches(first_taught.get(feature))})"
             for feature, names in sorted(used.items())]
    yield unit.about.finding("untaught-feature", f"uses what no lesson up to here teaches: {'; '.join(parts)}. "
                                                 "Teach it earlier or write the code without it")


def _who_teaches(lesson: Lesson | None) -> str:
    return f"taught later, in {lesson.where}" if lesson else "no lesson teaches it"
