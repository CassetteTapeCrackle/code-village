"""Rule right-refused: a rewrite of the model solution that behaves the same must pass its tests and hidden cases.

A failure means a test looks at how the code is written, not at what it does (spec 11).
"""

import re
from collections.abc import Callable, Iterable, Sequence
from typing import cast

from ..adapter import CheckJob, CheckOutcome, FeatureQuery, LanguageAdapter, Rewrite, passes
from ..cache import Computed, Group, cache_for, per_group
from ..cases.expect import CasesProblem, buildable_cases, item_decl
from ..cases.spec import ProgramShape
from ..finding import Finding, subject
from ..model import Content, Item

PRINT_CHECKS = ("run_program", "PROGRAM", "stdout")  # tests that read what the code prints


def _checks_printing(item: Item) -> bool:
    try:
        decl = item_decl(item)
    except CasesProblem:  # cases-decl-invalid reports it
        decl = None
    return any(word in item.tests for word in PRINT_CHECKS) or (decl is not None and isinstance(decl.shape,
                                                                                                ProgramShape))


def kept(rewrite: Rewrite, group: Sequence[Item]) -> bool:
    """Leave out a renamed parameter that a prompt names, and a debug print where printed output is checked."""
    if rewrite.transform == "rename-params":
        name = rewrite.id.split(":", 1)[1]
        return not any(re.search(rf"\b{re.escape(name)}\b", item.prompt) for item in group)
    if rewrite.transform == "add-debug-print":
        return not any(_checks_printing(item) for item in group)
    return True


def keeping_required(rewrites: list[Rewrite], group: Sequence[Item], adapter: LanguageAdapter) -> list[Rewrite]:
    """The rewrites that still use every construct the group's tasks require: one that drops a required
    construct is expected to fail, so it says nothing about the tests."""
    needs = {need.id: list(need.detect) for item in group for need in item.requires}
    if not needs:
        return rewrites
    found = adapter.features([FeatureQuery(r.code) for r in rewrites], needs)
    return [r for r, features in zip(rewrites, found, strict=True) if needs.keys() <= features]


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


def refusals(groups: Sequence[Group], outcomes: Sequence[CheckOutcome | None],
             answers: Sequence[Sequence[str]]) -> list[Computed]:
    """Per group: whether the solution passes, and each answer's failure, from the outcomes of the solution then
    of each answer on every suite. Settled when nothing ran out of time."""
    found: list[Computed] = []
    each = iter(outcomes)
    for group, names in zip(groups, answers, strict=True):
        size = len(group)
        solution = [next(each) for _ in range(size)]
        ran = [(name, [next(each) for _ in range(size)]) for name in names]
        failures = [[name, failure] for name, out in ran if (failure := first_failure(out))]
        settled = all(o is not None for o in solution) and all(o is not None for _, out in ran for o in out)
        found.append(({"passes": all(passes(o) for o in solution), "refused": failures}, settled))
    return found


def answer_jobs(groups: Sequence[Group], codes: Sequence[Sequence[str]],
                adapter: LanguageAdapter) -> list[CheckJob]:
    """The solution, then each answer, on every suite of its group (visible tests and hidden cases)."""
    suites = [[(item, buildable_cases(item, adapter)) for item in group] for group in groups]
    return [CheckJob(code, item.tests, item.strict, cases, item.requires)
            for group, suite, answers in zip(groups, suites, codes, strict=True)
            for code in [group[0].solution, *answers] for item, cases in suite]


def refused(content: Content, kind: str, groups: Sequence[Group], answers: Callable[[Group], list[tuple[str, str]]],
            adapter: LanguageAdapter) -> list[list[list[str]]]:
    """Per group, the (name, failure) of every answer the tests refuse, cached; none while the solution fails
    (solution-fails reports it, and the tests may be what is wrong)."""
    def compute(todo: list[Group]) -> list[Computed]:
        named = [answers(group) for group in todo]
        jobs = answer_jobs(todo, [[code for _, code in found] for found in named], adapter)
        return refusals(todo, adapter.check(jobs), [[name for name, _ in found] for found in named])

    values = per_group(groups, cache_for(content, kind), compute)
    return [cast(list[list[str]], v["refused"]) if v["passes"] else []
            for v in (cast(dict[str, object], value) for value in values)]


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    groups = content.solution_groups()

    def answers(group: Group) -> list[tuple[str, str]]:
        wanted = [r for r in adapter.rewrites(group[0].solution) if kept(r, group)]
        return [(r.id, r.code) for r in keeping_required(wanted, group, adapter)]

    for group, failures in zip(groups, refused(content, "rewrites", groups, answers, adapter), strict=True):
        first = group[0]
        about = subject(first.id, first.fingerprint, first.folder / "solution.py", content.root)
        for rewrite_id, failure in failures:
            yield about.finding("right-refused", f"the solution rewritten by {rewrite_id} behaves the same but is "
                                                 f"refused ({failure}): a test checks how the code is written")
