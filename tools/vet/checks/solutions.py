"""Rules solution-fails and starter-passes: every solution passes its tests, no starter does."""

from collections.abc import Iterable

from ..adapter import LIMIT, CheckJob, LanguageAdapter, passes
from ..finding import Finding, subject
from ..model import Content


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    yield from _solutions(content, adapter)
    yield from _starters(content, adapter)


def _solutions(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    items = list(content.items())
    jobs = [CheckJob(item.solution, item.tests, item.strict, requires=item.requires) for item in items]
    outcomes = adapter.check(jobs)
    for item, outcome in zip(items, outcomes, strict=True):
        about = subject(item.id, item.fingerprint, item.folder / "solution.py", content.root)
        if outcome is None:
            yield about.finding("solution-fails", f"{item.label} ran longer than {LIMIT} s")
        elif not passes(outcome):
            failed = outcome["error"] or [r for r in outcome["results"] if not r["passed"]]
            yield about.finding("solution-fails", f"{item.label} fails: {failed}")


def _starters(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    """Tasks and variants against their own tests; a boss starter against its first stage."""
    items = [item for item in content.items() if item.kind in ("task", "variant")]
    jobs = [CheckJob(item.starter, item.tests, item.strict) for item in items]
    owners = [(item.id, item.fingerprint, item.folder) for item in items]
    for boss in content.bosses:
        if boss.stages:
            jobs.append(CheckJob(boss.starter, boss.stages[0].tests))
            owners.append((boss.id, boss.fingerprint, boss.folder))
    for (item_id, fingerprint, folder), outcome in zip(owners, adapter.check(jobs), strict=True):
        if passes(outcome):
            about = subject(item_id, fingerprint, folder / "starter.py", content.root)
            yield about.finding("starter-passes", "the starter already passes every test (the task is trivial)")
