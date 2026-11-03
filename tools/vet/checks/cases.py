"""Rules cases-missing, cases-decl-invalid, cases-too-few and solution-fails-cases: every item ships hidden cases
its own solution passes."""

import os
from collections.abc import Iterable
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from ..adapter import LIMIT, CheckJob, HiddenCase, LanguageAdapter
from ..cases.expect import CasesProblem, hidden_cases, item_decl
from ..cases.spec import NoCases
from ..finding import Finding, Subject, subject
from ..model import Content, Item

MIN_CASES = 20
DECL_FILES = {"task": "task.toml", "variant": "variant.toml", "stage": "stages", "hard": "boss.md"}


def _decl_path(item: Item) -> Path:
    return item.folder / DECL_FILES[item.kind]


def _built(item: Item, adapter: LanguageAdapter) -> list[HiddenCase] | CasesProblem:
    try:
        return hidden_cases(item, adapter)
    except CasesProblem as problem:
        return problem


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    items = list(content.items())
    # each item's expected values come from its own harness run, so threads run them side by side
    with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as pool:
        built = list(pool.map(lambda item: _built(item, adapter), items))
    jobs: list[CheckJob] = []
    owners: list[tuple[Subject, Item]] = []
    for item, cases in zip(items, built, strict=True):
        about = subject(item.id, item.fingerprint, _decl_path(item), content.root)
        if item.cases is None:
            yield about.finding("cases-missing", f"{item.seed} has no [cases] table: declare its inputs, or say why it "
                                                 'has none with none = "..." (content/README.md, Hidden cases)')
            continue
        if isinstance(cases, CasesProblem):
            yield about.finding(cases.rule, cases.message)
            continue
        decl = item_decl(item)
        if decl is None or isinstance(decl.shape, NoCases):
            continue
        if len(cases) < MIN_CASES:
            yield about.finding("cases-too-few", f"{item.seed} keeps only {len(cases)} hidden cases (at least "
                                                 f"{MIN_CASES}): widen the input types, or list the error the "
                                                 "solution raises in raises if the prompt names it")
        jobs.append(CheckJob(item.solution, item.tests, item.strict, tuple(cases)))
        owners.append((about, item))
    for (about, item), outcome in zip(owners, adapter.check(jobs), strict=True):
        if outcome is None:
            yield about.finding("solution-fails-cases", f"{item.label} ran longer than {LIMIT} s on its hidden cases")
            continue
        failed = [r["message"] for r in outcome["results"] if r["hidden"] and not r["passed"]]
        if failed:  # the very solution that gave the expected values now gives others: it is not deterministic
            yield about.finding("solution-fails-cases", f"{item.label} disagrees with its own expected values: "
                                                        f"{failed[0]}")
