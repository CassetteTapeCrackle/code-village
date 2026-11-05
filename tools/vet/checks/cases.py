"""Rules cases-missing, cases-decl-invalid, cases-too-few and solution-fails-cases: every item ships hidden cases
its own solution passes."""

import ast
import os
import re
from collections.abc import Iterable
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from ..adapter import LIMIT, CheckJob, HiddenCase, LanguageAdapter
from ..cases.expect import CasesProblem, hidden_cases, item_decl
from ..cases.spec import CallShape, NoCases
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
        # another hash seed than the one that made the expected values: an answer built on a hash is not repeatable
        jobs.append(CheckJob(item.solution, item.tests, item.strict, tuple(cases), item.requires, hash_seed=1))
        owners.append((about, item))
    for (about, item), outcome in zip(owners, adapter.check(jobs), strict=True):
        if outcome is None:
            yield about.finding("solution-fails-cases", f"{item.label} ran longer than {LIMIT} s on its hidden cases")
            continue
        hidden = [r for r in outcome["results"] if r["hidden"]]
        if not hidden:  # the cases never ran: the harness crashed, or the solution did not load
            yield about.finding("solution-fails-cases", f"{item.label} could not run its hidden cases: "
                                                        f"{outcome['error'] or 'no result came back'}")
        elif not hidden[0]["passed"]:  # the solution that gave the expected values now gives others
            yield about.finding("solution-fails-cases", f"{item.label} disagrees with its own expected values: "
                                                        f"{hidden[0]['message']}")


LEARNER_NAME = re.compile(r"""learner\[\s*['"]([A-Za-z_]\w*)['"]\s*\]""")


def learner_names(tests: str) -> set[str]:
    """The names tests take from the learner's code: learner["double"]."""
    return set(LEARNER_NAME.findall(tests))


def always_true(tests: str, function: str) -> bool:
    """True when the named function in tests returns True on every path it returns on, so it judges nothing."""
    try:
        tree = ast.parse(tests)
    except SyntaxError:
        return False
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == function:
            returns = [r.value for r in ast.walk(node) if isinstance(r, ast.Return)]
            return bool(returns) and all(isinstance(v, ast.Constant) and v.value is True for v in returns)
    return False


def check_declaration(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    """Rules cases-target-unused and valid-always-true: a [cases] table must point at what the tests judge."""
    del adapter  # reads the declaration and the tests only
    for item in content.items():
        try:
            decl = item_decl(item)
        except CasesProblem:  # cases-decl-invalid reports it
            continue
        if decl is None or isinstance(decl.shape, NoCases):
            continue
        about = subject(item.id, item.fingerprint, _decl_path(item), content.root)
        target = decl.shape.call if isinstance(decl.shape, CallShape) else getattr(decl.shape, "cls", None)
        names = learner_names(item.tests)
        if target and names and target not in names:
            yield about.finding("cases-target-unused", f"{item.seed} declares hidden cases for {target}, but its tests "
                                                       f"judge {', '.join(sorted(names))}: the cases test the wrong "
                                                       "thing (a copied [cases] table?)")
        if decl.valid and always_true(item.tests, decl.valid):
            yield about.finding("valid-always-true", f"the validity rule {decl.valid} of {item.seed} returns True "
                                                     "for every answer, so its hidden cases accept anything")
