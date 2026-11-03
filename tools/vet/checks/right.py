"""Rules right-fails and right-missing: each right/*.py is a correct answer written another way, so it must pass
the visible tests and hidden cases (for a boss, every stage and hard mode), and every item needs one."""

from collections.abc import Iterable

from ..adapter import CheckJob, LanguageAdapter, passes
from ..cases.expect import buildable_cases
from ..finding import Finding, subject
from ..model import Content
from .rewrites import first_failure


def _missing(content: Content) -> Iterable[Finding]:
    owners = [(t.id, t.fingerprint, t.folder, t.right) for t in content.tasks]
    owners += [(v.id, v.fingerprint, v.folder, v.right) for t in content.tasks for v in t.variants]
    owners += [(b.id, b.fingerprint, b.folder, b.right) for b in content.bosses]
    for item, fingerprint, folder, right in owners:
        if not right:
            yield subject(item, fingerprint, folder / "right", content.root).finding(
                "right-missing", "no right/*.py: add a correct answer written differently from the solution "
                                 "(another loop, other names, another library call), so Check is seen to accept it")


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    groups = content.solution_groups()
    suites = [[(item, buildable_cases(item, adapter)) for item in group] for group in groups]
    jobs = [CheckJob(code, item.tests, item.strict, cases)
            for group, suite in zip(groups, suites, strict=True)
            for code in [group[0].solution, *(path.read_text() for path in group[0].right)] for item, cases in suite]
    outcomes = iter(adapter.check(jobs))
    for group, suite in zip(groups, suites, strict=True):
        solution = [next(outcomes) for _ in suite]
        refused = [(path, first_failure([next(outcomes) for _ in suite])) for path in group[0].right]
        if not all(passes(o) for o in solution):  # solution-fails reports it; the tests may be what is wrong
            continue
        for path, failure in refused:
            if failure:
                about = subject(group[0].id, group[0].fingerprint, path, content.root)
                yield about.finding("right-fails", f"right/{path.name} is a correct answer, but Check refuses it "
                                                   f"({failure}): loosen the test, or fix the answer")
    yield from _missing(content)
