"""Every runtime verdict CPython reached on the content, for scripts/vet-pyodide.mjs to repeat in Pyodide (spec 15).

content_check.py --jobs-out writes the file into .vet-cache/ (git-ignored). It holds model solutions, so it is never
bundled. A job CPython ran out of time on is left out: there is no verdict to compare.
"""

import json
from collections.abc import Iterable
from dataclasses import asdict
from pathlib import Path

from .adapter import CheckJob, CheckOutcome, LanguageAdapter, case_json, passes
from .cases.expect import CasesProblem, buildable_cases, item_decl
from .cases.generate import generate_inputs
from .cases.spec import NoCases
from .checks.claims import runnable
from .checks.versions import answers
from .model import Content
from .python.interpreters import pins

Job = dict[str, object]


def _verdict(outcome: CheckOutcome) -> str:
    return "pass" if passes(outcome) else "fail"


def block_jobs(content: Content, adapter: LanguageAdapter) -> Iterable[Job]:
    """Example and predict blocks with their output, claims with pass or fail."""
    blocks = runnable(content)
    for at, ((lesson, block), ran) in enumerate(zip(blocks, adapter.run([b.code for _, b in blocks]), strict=True)):
        if ran is None:
            continue
        claim = "fail" if ran["error"] else "pass"
        yield {"id": f"{lesson.where}:block{at}", "kind": block.kind, "code": block.code,
               "expect": claim if block.kind == "claim" else {"output": ran["stdout"], "error": ran["error"]}}


def check_jobs(content: Content, adapter: LanguageAdapter) -> Iterable[Job]:
    """The solution, starter, wrong/ and right/ answers of every item on its tests and hidden cases."""
    named = [(f"{item.seed}:{name}", CheckJob(code, item.tests, item.strict, buildable_cases(item, adapter)))
             for group in content.solution_groups() for name, code in answers(group) for item in group]
    for (job_id, job), outcome in zip(named, adapter.check([job for _, job in named]), strict=True):
        if outcome is not None:
            yield {"id": job_id, "kind": "check", "code": job.code, "tests": job.tests, "strict": job.strict,
                   "cases": [case_json(case) for case in job.cases], "expect": _verdict(outcome)}


def expect_jobs(content: Content, adapter: LanguageAdapter) -> Iterable[Job]:
    """The model solution's answers to each item's hidden inputs: what the bundle's hidden cases expect."""
    for item in content.items():
        try:
            decl = item_decl(item)
        except CasesProblem:  # cases-decl-invalid reports it
            continue
        if decl is None or isinstance(decl.shape, NoCases):
            continue
        inputs = generate_inputs(decl, item.seed, decl.count)
        values = adapter.expect(item.solution, inputs)
        if values is not None:
            yield {"id": f"{item.seed}:expect", "kind": "expect", "code": item.solution,
                   "cases": [asdict(i) for i in inputs], "expect": {"values": [asdict(v) for v in values]}}


def write_jobs(content: Content, adapter: LanguageAdapter, path: Path) -> int:
    """Writes the jobs file and returns how many jobs it holds."""
    jobs = [*block_jobs(content, adapter), *check_jobs(content, adapter), *expect_jobs(content, adapter)]
    versions = {name: version for name, version in (pin.split("==", 1) for pin in pins())}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps({"pins": versions, "jobs": jobs}, indent=1))
    return len(jobs)
