"""Rule weak-tests: every broken version of a model solution (a mutant) must fail its visible tests or hidden cases.

A survivor is run on a large fuzz set from the item's [cases]: when it agrees with the solution everywhere it is
equivalent (listed, not reported). Results are cached per item (tools/vet/cache.py, kind "mutation"); the stored
broken versions are what a later "Spot the bug" mode reuses.
"""

import os
from collections import Counter
from collections.abc import Iterable, Sequence
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Literal, cast

from ..adapter import CheckJob, CheckOutcome, LanguageAdapter, Mutant
from ..cache import Computed, Group, cache_for, framework_hash, per_group, read
from ..cases.expect import CasesProblem, buildable_cases, item_decl
from ..cases.spec import CasesDecl, NoCases
from ..finding import Finding, subject
from ..model import Content, Item

FUZZ_COUNT = 2000
# a mutant that loops forever counts as killed; a third of the general limit keeps the dozens that do cheap,
# and the slowest real job (World 3 with scikit-learn) needs about 2 s
MUTANT_LIMIT = 10
KIND = "mutation"
Verdict = Literal["visible", "hidden", "equivalent", "survived"]


@dataclass(frozen=True)
class MutantResult:
    """What became of one mutant; `differs` says how a survivor differs from the solution."""

    id: str
    operator: str
    line: int
    summary: str
    code: str
    verdict: Verdict
    differs: str = ""




def _first_verdict(outcomes: Sequence[CheckOutcome | None]) -> Verdict | None:
    """visible when some visible test fails it, hidden when only a hidden case does, None when it survives."""
    for outcome in outcomes:
        if outcome is None or outcome["error"] or any(not r["passed"] for r in outcome["results"] if not r["hidden"]):
            return "visible"
    if any(not r["passed"] for outcome in outcomes if outcome for r in outcome["results"] if r["hidden"]):
        return "hidden"
    return None


def _difference(outcome: CheckOutcome | None) -> str | None:
    """How a mutant differs from the solution on the fuzz cases; None when it agrees on every one."""
    if outcome is None:
        return "it runs out of time on the fuzz inputs"
    hidden = [r for r in outcome["results"] if r["hidden"]]
    if not hidden:
        return f"it cannot run the fuzz inputs: {outcome['error'] or 'no result came back'}"
    return None if hidden[0]["passed"] else hidden[0]["message"]


def _fuzz_verdict(difference: str | None) -> Verdict:
    return "equivalent" if difference == "" else "survived"


def _result(m: Mutant, verdict: Verdict, differs: str) -> MutantResult:
    return MutantResult(m.id, m.operator, m.line, m.summary, m.code, verdict, differs)


def _no_cases_hint(group: Group) -> str:
    if any(isinstance(decl.shape, NoCases) for item in group if (decl := _decl(item))):
        return "add a test that fails it (no hidden cases here, so check by hand whether it is equivalent)"
    return "add a test that fails it, and declare [cases] so equivalent mutants can be told apart"


def _decl(item: Item) -> CasesDecl | None:
    try:
        return item_decl(item)
    except CasesProblem:
        return None


class _Run:
    """One mutation run over many groups: every job goes to the adapter at once, so they run side by side."""

    def __init__(self, adapter: LanguageAdapter) -> None:
        self.adapter = adapter

    def results(self, groups: Sequence[Group]) -> list[tuple[list[MutantResult], bool]]:
        """Each group's results, and whether they are settled: a fuzz run that timed out or could not be built may
        come out differently on a less loaded machine, so such results are never cached. A mutant that runs out
        of time on its tests is killed (it loops forever) and settled."""
        mutants = [self.adapter.mutants(group[0].solution) for group in groups]
        verdicts = self._verdicts(groups, mutants)
        settled = [True] * len(groups)
        survivors = [(g, m) for g, vs in enumerate(verdicts) for m, v in enumerate(vs) if v is None]
        fuzzed = self._fuzz([(groups[g], mutants[g][m]) for g, m in survivors])
        differs = {key: difference for key, (difference, _) in zip(survivors, fuzzed, strict=True)}
        for (g, _), (_, sure) in zip(survivors, fuzzed, strict=True):
            settled[g] = settled[g] and sure
        return [([_result(m, verdicts[g][i] or _fuzz_verdict(differs[g, i]), differs.get((g, i)) or "")
                  for i, m in enumerate(ms)], settled[g]) for g, ms in enumerate(mutants)]

    def _verdicts(self, groups: Sequence[Group], mutants: Sequence[list[Mutant]]) -> list[list[Verdict | None]]:
        suites = [[(item, buildable_cases(item, self.adapter)) for item in group] for group in groups]
        jobs = [CheckJob(m.code, item.tests, item.strict, cases, item.requires, limit=MUTANT_LIMIT)
                for ms, suite in zip(mutants, suites, strict=True) for m in ms for item, cases in suite]
        outcomes = iter(self.adapter.check(jobs))
        return [[_first_verdict([next(outcomes) for _ in suite]) for _ in ms]
                for ms, suite in zip(mutants, suites, strict=True)]

    def _fuzz(self, survivors: Sequence[tuple[Group, Mutant]]) -> list[tuple[str | None, bool]]:
        """For each survivor: how it differs on the fuzz set ("" when it agrees, None when there is no fuzz set),
        and whether that answer is settled."""
        items = list({id(item): item for group, _ in survivors for item in group}.values())
        # each item's fuzz values come from its own harness run, so threads run them side by side
        with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as pool:
            built = pool.map(lambda i: buildable_cases(i, self.adapter, fuzz=FUZZ_COUNT), items)
            fuzz = dict(zip(map(id, items), built, strict=True))
        unbuilt = {id(i) for i in items if not fuzz[id(i)] and (d := _decl(i)) and not isinstance(d.shape, NoCases)}
        per_survivor = [[(item, fuzz[id(item)]) for item in group if fuzz[id(item)]] for group, _ in survivors]
        jobs = [CheckJob(m.code, item.tests, item.strict, cases, item.requires)
                for (_, m), suite in zip(survivors, per_survivor, strict=True) for item, cases in suite]
        outcomes = iter(self.adapter.check(jobs))
        found: list[tuple[str | None, bool]] = []
        for (group, _), suite in zip(survivors, per_survivor, strict=True):
            ran = [next(outcomes) for _ in suite]
            differences = [d for d in map(_difference, ran) if d]
            if any(id(item) in unbuilt for item in group):
                differences.append(f"its {FUZZ_COUNT} fuzz inputs could not be built (the solution ran out of time "
                                   "or crashed on them), so it cannot be told apart from an equivalent mutant")
            sure = all(o is not None for o in ran) and not any(id(item) in unbuilt for item in group)
            found.append((None if not suite and not differences else (differences[0] if differences else ""), sure))
        return found


def _from_json(entry: dict[str, object]) -> MutantResult:
    return MutantResult(str(entry["id"]), str(entry["operator"]), int(str(entry["line"])), str(entry["summary"]),
                        str(entry["code"]), cast(Verdict, entry["verdict"]), str(entry["differs"]))


def _from_value(value: object) -> list[MutantResult]:
    return [_from_json(entry) for entry in cast(list[dict[str, object]], value)]


GroupResults = list[tuple[Group, list[MutantResult]]]


def group_results(content: Content, adapter: LanguageAdapter, folder: Path | None) -> GroupResults:
    """Every group with its mutants' results, read from the cache folder when the group's fingerprint is there."""
    groups = content.solution_groups()

    def compute(todo: list[Group]) -> list[Computed]:
        return [([asdict(r) for r in results], settled) for results, settled in _Run(adapter).results(todo)]

    return [(g, _from_value(v)) for g, v in zip(groups, per_group(groups, folder, compute), strict=True)]


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    for group, results in group_results(content, adapter, cache_for(content, KIND)):
        first = group[0]
        about = subject(first.id, first.fingerprint, first.folder / "solution.py", content.root)
        for r in results:
            if r.verdict != "survived":
                continue
            what = f"the mutant {r.id} ({r.summary}) passes every test"
            if r.differs:
                yield about.finding("weak-tests", f"{what} and hidden case, but differs from the solution: "
                                                  f"{r.differs} Add a test or widen [cases] so it fails")
            else:
                yield about.finding("weak-tests", f"{what}: {_no_cases_hint(group)}")


def summary(content: Content, folder: Path) -> str:
    """Counts per verdict over the cached results, for the build output."""
    framework = framework_hash()
    counts: Counter[str] = Counter()
    for group in content.solution_groups():
        value = read(folder, group[0].fingerprint, framework)
        counts.update(r.verdict for r in (_from_value(value) if value is not None else []))
    return (f"mutants: {sum(counts.values())}, killed by visible tests {counts['visible']}, only by hidden cases "
            f"{counts['hidden']} (visible tests could be stronger), equivalent {counts['equivalent']}, "
            f"surviving {counts['survived']}")
