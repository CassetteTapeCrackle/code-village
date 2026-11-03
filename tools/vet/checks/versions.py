"""Rules version-differs and min-unexplained: content is written for Python 3.12 and newer (spec 3).

Every example, predict and claim block, and every solution, starter, wrong/ and right/ answer on its visible tests
and hidden cases, runs again on CPython 3.12 and 3.13. An output or verdict that differs from the build's Python
is version-differs, unless the block or item declares `min` above that version. A `min` the lesson text near the
block (or the item's prompt) does not name is min-unexplained. Results are cached like mutation (kind "versions").
"""

from collections.abc import Callable, Iterable, Sequence
from typing import cast

from ..adapter import CheckJob, CheckOutcome, LanguageAdapter, RunOutcome, passes
from ..cache import Computed, Group, cache_for, per_group, per_unit
from ..cases.expect import buildable_cases
from ..finding import Finding, subject
from ..load import PYTHONS
from ..model import CodeBlock, Content, Lesson, TextBlock
from ..python.adapter import PythonAdapter
from ..python.interpreters import OLDER_PYTHONS, interpreter
from .claims import runnable
from .libraries import build_python

KIND = "versions"
Differences = list[str]  # one message per version on which the unit differs


def _version(text: str) -> tuple[int, ...]:
    return tuple(int(part) for part in text.split("."))


def _older(min_python: str | None) -> list[str]:
    """The older Pythons a unit must agree on: those at or above its declared min (a min that is not a known
    Python is field-invalid already, so it counts as none)."""
    if min_python not in PYTHONS:
        return list(OLDER_PYTHONS)
    return [v for v in OLDER_PYTHONS if _version(v) >= _version(min_python)]


Ran = list[tuple[str, object]]  # (older Python, its result) for one unit


def _per_version(versions: Sequence[Sequence[str]], run: Callable[[str, list[int]], list[object]]) -> list[Ran]:
    """For each unit, (version, result) for each of its versions: every unit asking for a version runs at once."""
    found: list[Ran] = [[] for _ in versions]
    for version in OLDER_PYTHONS:
        units = [u for u, vs in enumerate(versions) if version in vs]
        for unit, result in zip(units, run(version, units) if units else [], strict=True):
            found[unit].append((version, result))
    return found


# lessons: each block's output on every version

def _describe(ran: RunOutcome | None) -> str:
    if ran is None:
        return "no result in time"
    shown = repr(ran["stdout"])
    return f"{shown} then {ran['error']}" if ran["error"] else shown


def _lesson_differences(adapter: LanguageAdapter, lessons: list[tuple[Lesson, list[CodeBlock]]]) -> list[Computed]:
    blocks = [(block, lesson_at) for lesson_at, (_, bs) in enumerate(lessons) for block in bs]
    base = adapter.run([block.code for block, _ in blocks])
    # a block that runs out of time here is example-fails or claim-fails already, so it is not run three times
    older = _per_version([_older(block.min) if here else [] for (block, _), here in zip(blocks, base, strict=True)],
                         lambda v, units: list(PythonAdapter(interpreter(v)).run([blocks[u][0].code for u in units])))
    messages: list[Differences] = [[] for _ in lessons]
    settled = [True] * len(lessons)
    for (block, lesson_at), here, others in zip(blocks, base, older, strict=True):
        if here is None:  # not compared, so the lesson's result must not be stored as settled
            settled[lesson_at] = False
        for version, there in others:
            ran = cast(RunOutcome | None, there)
            if ran is None:  # a slow machine, not a version difference: compared again next run
                settled[lesson_at] = False
                continue
            if ran != here:
                messages[lesson_at].append(
                    f"this {block.kind} block gives {_describe(here)} on Python {build_python()} but {_describe(ran)} "
                    f"on Python {version}: make it hold on both, or declare min= on its fence and say so in the text")
    return list(zip(messages, settled, strict=True))


def _lessons(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    by_lesson: dict[str, tuple[Lesson, list[CodeBlock]]] = {}
    for lesson, block in runnable(content):
        by_lesson.setdefault(lesson.where, (lesson, []))[1].append(block)
    units = list(by_lesson.values())
    values = per_unit(units, lambda u: (u[0].fingerprint, u[0].where), cache_for(content, KIND),
                      lambda todo: _lesson_differences(adapter, todo))
    for (lesson, _), messages in zip(units, values, strict=True):
        about = subject(lesson.where, lesson.fingerprint, lesson.path, content.root)
        yield from (about.finding("version-differs", m) for m in cast(Differences, messages))


# items: each answer's verdict on each suite, on every version

def answers(group: Group) -> list[tuple[str, str]]:
    first = group[0]
    return [("the solution", first.solution), ("the starter", first.starter),
            *((f"wrong/{p.name}", p.read_text()) for p in first.wrong),
            *((f"right/{p.name}", p.read_text()) for p in first.right)]


def _verdict(outcome: CheckOutcome | None) -> str:
    return "runs out of time" if outcome is None else "passes" if passes(outcome) else "fails"


def _group_differences(adapter: LanguageAdapter, groups: list[Group]) -> list[Computed]:
    jobs_of = [[CheckJob(code, item.tests, item.strict, cases) for _, code in answers(group)
                for item, cases in [(i, buildable_cases(i, adapter)) for i in group]] for group in groups]
    base = adapter.check([job for jobs in jobs_of for job in jobs])
    starts = [sum(map(len, jobs_of[:g])) for g in range(len(groups))]
    timed_out = [any(o is None for o in base[at:at + len(jobs)]) for at, jobs in zip(starts, jobs_of, strict=True)]
    older = _per_version([[] if late else _older(group[0].min) for group, late in zip(groups, timed_out, strict=True)],
                         lambda v, units: _split(PythonAdapter(interpreter(v)).check(
                             [job for u in units for job in jobs_of[u]]), [len(jobs_of[u]) for u in units]))
    found: list[Computed] = []
    for group, jobs, others, at in zip(groups, jobs_of, older, starts, strict=True):
        here = base[at:at + len(jobs)]
        labels = [(name, item) for name, _ in answers(group) for item in group]
        messages, settled = [], all(o is not None for o in here)
        for version, there in others:
            outcomes = cast(list[CheckOutcome | None], there)
            settled = settled and all(o is not None for o in outcomes)
            for (name, item), mine, theirs in zip(labels, here, outcomes, strict=True):
                if theirs is not None and _verdict(mine) != _verdict(theirs):
                    messages.append(f"{name} {_verdict(mine)} the tests of {item.seed} on Python {build_python()} "
                                    f"but {_verdict(theirs)} on Python {version}: make it hold on both, or declare "
                                    "min and say so in the prompt")
                    break
        found.append((messages, settled))
    return found


def _split(outcomes: Sequence[CheckOutcome | None], sizes: Sequence[int]) -> list[object]:
    parts: list[object] = []
    at = 0
    for size in sizes:
        parts.append(list(outcomes[at:at + size]))
        at += size
    return parts


def _items(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    groups = content.solution_groups()
    values = per_group(groups, cache_for(content, KIND), lambda todo: _group_differences(adapter, todo))
    for group, messages in zip(groups, values, strict=True):
        first = group[0]
        about = subject(first.id, first.fingerprint, first.folder, content.root)
        yield from (about.finding("version-differs", m) for m in cast(Differences, messages))


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    yield from _lessons(content, adapter)
    yield from _items(content, adapter)


# min-unexplained needs no run, so a quick build keeps it

def _names(text: str, version: str) -> bool:
    return f"Python {version}" in text


def _needs_saying(min_python: str | None) -> bool:
    """A min above the oldest supported Python; an unknown one is field-invalid instead."""
    return min_python in PYTHONS and min_python != PYTHONS[0]


def check_min(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    for lesson in content.lessons:
        for at, block in enumerate(lesson.blocks):
            if not isinstance(block, CodeBlock) or not _needs_saying(block.min):
                continue
            near = [b.markdown for b in lesson.blocks[max(at - 1, 0):at + 2] if isinstance(b, TextBlock)]
            if not any(_names(text, str(block.min)) for text in near):
                yield subject(lesson.where, lesson.fingerprint, lesson.path, content.root).finding(
                    "min-unexplained", f"a {block.kind} block declares min={block.min}, but the text next to it never "
                                       f"says \"Python {block.min}\": tell the learner it needs that version")
    for group in content.solution_groups():
        first = group[0]
        if not _needs_saying(first.min) or any(_names(item.prompt, str(first.min)) for item in group):
            continue
        yield subject(first.id, first.fingerprint, first.folder, content.root).finding(
            "min-unexplained", f"{first.id} declares min = \"{first.min}\", but its prompt never says "
                               f"\"Python {first.min}\": tell the learner it needs that version")
