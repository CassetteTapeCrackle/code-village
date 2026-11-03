"""Rule weak-tests: every broken version of a model solution (a mutant) must fail its visible tests or hidden cases.

A survivor is run on a large fuzz set from the item's [cases]: when it agrees with the solution everywhere it is
equivalent (listed, not reported). Results are kept per item fingerprint in .vet-cache/mutation/ for the real
content; the stored broken versions are what a later "Spot the bug" mode reuses.
"""

import hashlib
import json
import os
import tempfile
from collections import Counter
from collections.abc import Iterable, Sequence
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Literal, cast

from ..adapter import CheckJob, CheckOutcome, HiddenCase, LanguageAdapter, Mutant
from ..cases.expect import CasesProblem, hidden_cases, item_decl
from ..cases.spec import CasesDecl, NoCases
from ..finding import Finding, subject
from ..model import Content, Item
from ..python.adapter import ROOT

FUZZ_COUNT = 2000
CACHE = ROOT / ".vet-cache" / "mutation"
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


Group = list[Item]  # items that share one model solution: a task or variant alone, a boss's stages and hard mode


def _groups(content: Content) -> list[Group]:
    groups: dict[tuple[str, str], Group] = {}
    for item in content.items():
        groups.setdefault((item.id, item.solution), []).append(item)
    return list(groups.values())


def _cases(item: Item, adapter: LanguageAdapter, fuzz: int = 0) -> tuple[HiddenCase, ...]:
    """The item's hidden cases, or none when they cannot be built (the cases rules report why)."""
    try:
        return tuple(hidden_cases(item, adapter, fuzz=fuzz))
    except CasesProblem:
        return ()


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

    def results(self, groups: Sequence[Group]) -> list[list[MutantResult]]:
        mutants = [self.adapter.mutants(group[0].solution) for group in groups]
        verdicts = self._verdicts(groups, mutants)
        survivors = [(g, m) for g, vs in enumerate(verdicts) for m, v in enumerate(vs) if v is None]
        fuzzed = self._fuzz([(groups[g], mutants[g][m]) for g, m in survivors])
        differs = dict(zip(survivors, fuzzed, strict=True))
        return [[_result(m, verdicts[g][i] or _fuzz_verdict(differs[g, i]), differs.get((g, i)) or "")
                 for i, m in enumerate(ms)] for g, ms in enumerate(mutants)]

    def _verdicts(self, groups: Sequence[Group], mutants: Sequence[list[Mutant]]) -> list[list[Verdict | None]]:
        suites = [[(item, _cases(item, self.adapter)) for item in group] for group in groups]
        jobs = [CheckJob(m.code, item.tests, item.strict, cases)
                for ms, suite in zip(mutants, suites, strict=True) for m in ms for item, cases in suite]
        outcomes = iter(self.adapter.check(jobs))
        return [[_first_verdict([next(outcomes) for _ in suite]) for _ in ms]
                for ms, suite in zip(mutants, suites, strict=True)]

    def _fuzz(self, survivors: Sequence[tuple[Group, Mutant]]) -> list[str | None]:
        """For each survivor: how it differs on the fuzz set, "" when it agrees, None when there is no fuzz set."""
        items = list({id(item): item for group, _ in survivors for item in group}.values())
        # each item's fuzz values come from its own harness run, so threads run them side by side
        with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as pool:
            fuzz = dict(zip(map(id, items), pool.map(lambda i: _cases(i, self.adapter, FUZZ_COUNT), items),
                            strict=True))
        per_survivor = [[(item, fuzz[id(item)]) for item in group if fuzz[id(item)]] for group, _ in survivors]
        jobs = [CheckJob(m.code, item.tests, item.strict, cases)
                for (_, m), suite in zip(survivors, per_survivor, strict=True) for item, cases in suite]
        outcomes = iter(self.adapter.check(jobs))
        found: list[str | None] = []
        for suite in per_survivor:
            differences = [d for d in [_difference(next(outcomes)) for _ in suite] if d]
            found.append(None if not suite else (differences[0] if differences else ""))
        return found


def _framework_hash() -> str:
    """What every cached result depends on besides the item: the framework's own source."""
    digest = hashlib.sha256()
    for path in [ROOT / "py" / "harness.py", *sorted((ROOT / "tools" / "vet").rglob("*.py"))]:
        digest.update(path.read_bytes())
    return digest.hexdigest()[:12]


def _load(path: Path, framework: str) -> list[MutantResult] | None:
    try:
        data = json.loads(path.read_text())
    except (OSError, ValueError):
        return None
    if not isinstance(data, dict) or data.get("framework") != framework:
        return None
    return [_from_json(entry) for entry in cast(list[dict[str, object]], data["mutants"])]


def _from_json(entry: dict[str, object]) -> MutantResult:
    return MutantResult(str(entry["id"]), str(entry["operator"]), int(str(entry["line"])), str(entry["summary"]),
                        str(entry["code"]), cast(Verdict, entry["verdict"]), str(entry["differs"]))


def _store(path: Path, data: dict[str, object]) -> None:
    # written aside and renamed, so a run reading the cache at the same time never sees half a file
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile("w", dir=path.parent, suffix=".tmp", delete=False) as out:
        json.dump(data, out, indent=1)
    Path(out.name).replace(path)


GroupResults = list[tuple[Group, list[MutantResult]]]


def group_results(content: Content, adapter: LanguageAdapter, cache: Path | None) -> GroupResults:
    """Every group with its mutants' results, read from cache when the group's fingerprint is there."""
    groups = _groups(content)
    framework = _framework_hash() if cache else ""
    cached = [_load(cache / f"{g[0].fingerprint}.json", framework) if cache else None for g in groups]
    fresh = iter(_Run(adapter).results([g for g, c in zip(groups, cached, strict=True) if c is None]))
    out = []
    for group, stored in zip(groups, cached, strict=True):
        results = stored if stored is not None else next(fresh)
        if cache and stored is None:
            _store(cache / f"{group[0].fingerprint}.json", {"framework": framework, "item": group[0].id,
                                                            "mutants": [asdict(r) for r in results]})
        out.append((group, results))
    return out


def cache_for(content: Content) -> Path | None:
    """.vet-cache/mutation/ for the real content; for other content (fixtures, canaries) the folder named by
    VET_CACHE, which the Python tests set so canaries share the results of the items they leave unchanged."""
    if content.root.resolve() == (ROOT / "content").resolve():
        return CACHE
    shared = os.environ.get("VET_CACHE")
    return Path(shared) / "mutation" if shared else None


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    for group, results in group_results(content, adapter, cache_for(content)):
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


def summary(content: Content, cache: Path) -> str:
    """Counts per verdict over the cached results, for the build output."""
    framework = _framework_hash()
    counts: Counter[str] = Counter()
    for group in _groups(content):
        counts.update(r.verdict for r in _load(cache / f"{group[0].fingerprint}.json", framework) or [])
    return (f"mutants: {sum(counts.values())}, killed by visible tests {counts['visible']}, only by hidden cases "
            f"{counts['hidden']} (visible tests could be stronger), equivalent {counts['equivalent']}, "
            f"surviving {counts['survived']}")
