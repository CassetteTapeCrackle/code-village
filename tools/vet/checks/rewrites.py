"""Rule right-refused: a rewrite of the model solution that behaves the same must pass its tests and hidden cases.

A failure means a test looks at how the code is written, not at what it does (spec 11).
"""

import re
from collections.abc import Iterable, Sequence

from ..adapter import CheckJob, CheckOutcome, LanguageAdapter, Rewrite, passes
from ..cases.expect import buildable_cases
from ..finding import Finding, subject
from ..model import Content, Item

PRINT_CHECKS = ("run_program", "PROGRAM", "stdout")  # tests that read what the code prints


def kept(rewrite: Rewrite, group: Sequence[Item]) -> bool:
    """Leave out a renamed parameter that a prompt names, and a debug print where the tests read printed output."""
    if rewrite.transform == "rename-params":
        name = rewrite.id.split(":", 1)[1]
        return not any(re.search(rf"\b{re.escape(name)}\b", item.prompt) for item in group)
    if rewrite.transform == "add-debug-print":
        return not any(word in item.tests for item in group for word in PRINT_CHECKS)
    return True


def first_failure(outcomes: Sequence[CheckOutcome | None]) -> str | None:
    """What the first failing suite says, or None when every suite passes."""
    for outcome in outcomes:
        if outcome is None:
            return "it runs out of time"
        if outcome["error"]:
            return outcome["error"]
        failed = [r for r in outcome["results"] if not r["passed"]]
        if failed:
            return f"{failed[0]['name']}: {failed[0]['message']}"
    return None


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    groups = content.solution_groups()
    suites = [[(item, buildable_cases(item, adapter)) for item in group] for group in groups]
    candidates = [[r for r in adapter.rewrites(group[0].solution) if kept(r, group)] for group in groups]
    jobs = [CheckJob(code, item.tests, item.strict, cases)
            for group, suite, rewrites in zip(groups, suites, candidates, strict=True)
            for code in [group[0].solution, *(r.code for r in rewrites)] for item, cases in suite]
    outcomes = iter(adapter.check(jobs))
    for group, suite, rewrites in zip(groups, suites, candidates, strict=True):
        solution = [next(outcomes) for _ in suite]
        refused = [(r, first_failure([next(outcomes) for _ in suite])) for r in rewrites]
        if not all(passes(o) for o in solution):  # solution-fails reports it; every rewrite would fail too
            continue
        first = group[0]
        about = subject(first.id, first.fingerprint, first.folder / "solution.py", content.root)
        for rewrite, failure in refused:
            if failure:
                yield about.finding("right-refused", f"the solution rewritten by {rewrite.id} behaves the same but is "
                                                     f"refused ({failure}): a test checks how the code is written")
