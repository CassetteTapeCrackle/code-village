"""Rule wrong-passes: each wrong/*.py is a mistake a learner could make, so some test must fail it."""

from collections.abc import Iterable
from pathlib import Path

from ..adapter import CheckJob, LanguageAdapter, passes
from ..finding import Finding, subject
from ..model import Content

Suite = tuple[str, bool]  # tests and strict


def _groups(content: Content) -> Iterable[tuple[str, str, tuple[Path, ...], list[Suite]]]:
    """Each owner of wrong/ files with the suites a wrong answer must fail at least one of."""
    for task in content.tasks:
        yield task.id, task.fingerprint, task.wrong, [(task.tests, task.strict)]
        for v in task.variants:
            yield v.id, v.fingerprint, v.wrong, [(v.tests, v.strict)]
    for boss in content.bosses:
        suites = [(stage.tests, False) for stage in boss.stages] + [(boss.hard_tests, False)]
        yield boss.id, boss.fingerprint, boss.wrong, suites


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    cases = [(item, fp, wrong, suites) for item, fp, files, suites in _groups(content) for wrong in files]
    jobs = [CheckJob(wrong.read_text(), tests, strict) for _, _, wrong, suites in cases for tests, strict in suites]
    outcomes = iter(adapter.check(jobs))
    for item, fingerprint, wrong, suites in cases:
        # a list, not a generator: every outcome is consumed so the iterator stays in step with the jobs
        if all([passes(next(outcomes)) for _ in suites]):
            about = subject(item, fingerprint, wrong, content.root)
            yield about.finding("wrong-passes", f"wrong/{wrong.name} passes every test: the tests miss that mistake")
