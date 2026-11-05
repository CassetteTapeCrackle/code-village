"""Rules wrong-passes and wrong-too-few: each wrong/*.py is a mistake a learner could make, so some test must fail
it, and every item writes out at least two."""

import ast
from collections.abc import Iterable
from pathlib import Path

from ..adapter import CheckJob, LanguageAdapter, passes
from ..finding import Finding, subject
from ..model import Content

Suite = tuple[str, bool]  # tests and strict


MIN_WRONG = 2


def _groups(content: Content) -> Iterable[tuple[str, str, Path, tuple[Path, ...], list[Suite]]]:
    """Each owner of wrong/ files (id, fingerprint, folder) with the suites a wrong answer must fail one of."""
    for task in content.tasks:
        yield task.id, task.fingerprint, task.folder, task.wrong, [(task.tests, task.strict)]
        for v in task.variants:
            yield v.id, v.fingerprint, v.folder, v.wrong, [(v.tests, v.strict)]
    for boss in content.bosses:
        suites = [(stage.tests, False) for stage in boss.stages] + [(boss.hard_tests, False)]
        yield boss.id, boss.fingerprint, boss.folder, boss.wrong, suites


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    groups = list(_groups(content))
    for item, fingerprint, folder, files, _ in groups:
        if len(files) < MIN_WRONG:
            yield subject(item, fingerprint, folder / "wrong", content.root).finding(
                "wrong-too-few", f"{len(files)} wrong/*.py (at least {MIN_WRONG}): write out the mistakes a learner "
                                 "is likely to make (one side of a range, an edge, the wrong attribute)")
    cases = [(item, fp, wrong, suites) for item, fp, _, files, suites in groups for wrong in files]
    jobs = [CheckJob(wrong.read_text(), tests, strict) for _, _, wrong, suites in cases for tests, strict in suites]
    outcomes = iter(adapter.check(jobs))
    for item, fingerprint, wrong, suites in cases:
        # a list, not a generator: every outcome is consumed so the iterator stays in step with the jobs
        if all([passes(next(outcomes)) for _ in suites]):
            about = subject(item, fingerprint, wrong, content.root)
            yield about.finding("wrong-passes", f"wrong/{wrong.name} passes every test: the tests miss that mistake")


def defined_names(code: str) -> set[str]:
    """The functions and classes a file defines at its top level."""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return set()
    return {n.name for n in tree.body if isinstance(n, ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef)}


def check_names(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    """Rule wrong-misses-name: a wrong/ answer must define what the solution defines, or it fails on the missing name
    and says nothing about its mistake."""
    del adapter  # reads the files only
    for group in content.solution_groups():
        first = group[0]
        wanted = defined_names(first.solution)
        for path in first.wrong:
            missing = sorted(wanted - defined_names(path.read_text()))
            if missing:
                about = subject(first.id, first.fingerprint, path, content.root)
                yield about.finding("wrong-misses-name", f"wrong/{path.name} does not define {', '.join(missing)}, so "
                                                         "it fails on the name and shows no mistake: keep the names, "
                                                         "change the logic")
