"""PythonAdapter: runs py/harness.py in subprocesses, several at once."""

import json
import os
import subprocess
import sys
from collections.abc import Mapping, Sequence
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict
from pathlib import Path
from typing import cast

from ..adapter import (
    LIMIT,
    CaseInput,
    CaseValue,
    CheckJob,
    CheckOutcome,
    FeatureQuery,
    Mutant,
    Rewrite,
    RunOutcome,
    ToolError,
    case_json,
)
from .mutate import mutants
from .rewrite import rewrites

ROOT = Path(__file__).resolve().parents[3]
HARNESS = ROOT / "py" / "harness.py"
# one maths thread per job: the jobs already run side by side, one per CPU
ONE_THREAD = {"OMP_NUM_THREADS": "1", "OPENBLAS_NUM_THREADS": "1"}

Job = dict[str, object]
CAPPED = Path(__file__).with_name("capped.py")  # runs the harness with a memory cap where possible


class PythonAdapter:
    extension = ".py"

    def __init__(self, python: Path | None = None) -> None:
        self.python = str(python) if python else sys.executable
        # the bundle shows the very runs the checks judged, and nothing runs twice
        self._runs: dict[str, RunOutcome | None] = {}
        self._checked: dict[CheckJob, CheckOutcome | None] = {}
        self._expected: dict[tuple[str, tuple[CaseInput, ...]], list[CaseValue] | None] = {}

    def run(self, codes: Sequence[str]) -> list[RunOutcome | None]:
        new = list(dict.fromkeys(code for code in codes if code not in self._runs))
        outcomes = self._harness_all([{"mode": "run", "code": code, "inputs": []} for code in new])
        self._runs.update(zip(new, (cast(RunOutcome | None, outcome) for outcome in outcomes), strict=True))
        return [self._runs[code] for code in codes]

    def check(self, jobs: Sequence[CheckJob]) -> list[CheckOutcome | None]:
        new = list(dict.fromkeys(job for job in jobs if job not in self._checked))
        if not new:
            return [self._checked[job] for job in jobs]
        harness_jobs: list[Job] = [{"mode": "check", "code": job.code, "tests": job.tests, "strict": job.strict,
                                    "cases": [case_json(case) for case in job.cases]} for job in new]
        outcomes = self._harness_all(harness_jobs, [job.limit for job in new])
        self._checked.update(zip(new, (cast(CheckOutcome | None, outcome) for outcome in outcomes), strict=True))
        return [self._checked[job] for job in jobs]

    def expect(self, code: str, cases: Sequence[CaseInput]) -> list[CaseValue] | None:
        key = (code, tuple(cases))
        if key not in self._expected:
            [out] = self._harness_all([{"mode": "expect", "code": code, "cases": [asdict(c) for c in cases]}])
            self._expected[key] = _case_values(out)
        return self._expected[key]

    def mutants(self, code: str) -> list[Mutant]:
        return mutants(code)

    def rewrites(self, code: str) -> list[Rewrite]:
        return rewrites(code)

    def features(self, queries: Sequence[FeatureQuery], vocabulary: Mapping[str, Sequence[str]]
                 ) -> list[frozenset[str]]:
        if not queries:
            return []
        job: Job = {"mode": "features", "vocabulary": {k: list(v) for k, v in vocabulary.items()},
                    "queries": [{"code": q.code, "own_names": list(q.own_names)} for q in queries]}
        [out] = self._harness_all([job])
        found = out.get("features") if out else None
        if not isinstance(found, list):
            raise ToolError("the feature detector could not run")
        return [frozenset(features) for features in cast(list[list[str]], found)]

    def _harness_all(self, jobs: Sequence[Job], limits: Sequence[float] = ()) -> list[dict[str, object] | None]:
        # the jobs are subprocesses, so threads run them side by side
        with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as pool:
            return list(pool.map(self._harness, jobs, limits or [LIMIT] * len(jobs)))

    def _harness(self, job: Job, limit: float) -> dict[str, object] | None:
        try:
            done = subprocess.run([self.python, "-I", str(CAPPED), str(HARNESS)], input=json.dumps(job),
                                  capture_output=True, text=True, timeout=limit, env={**os.environ, **ONE_THREAD},
                                  check=False)
        except subprocess.TimeoutExpired:
            return None
        if done.returncode != 0:  # e.g. the task's own tests.py has a syntax error
            last = (done.stderr.strip().splitlines() or ["no output"])[-1]
            return {"stdout": "", "error": f"the harness crashed: {last}", "results": []}
        result: dict[str, object] = json.loads(done.stdout)
        return result


def _case_values(out: dict[str, object] | None) -> list[CaseValue] | None:
    """The expect job's values; None when it ran out of time or the harness crashed (that gives no values)."""
    values = out.get("values") if out else None
    if not isinstance(values, list):
        return None
    return [CaseValue(v["repr"], v["raises"]) for v in cast(list[dict[str, str | None]], values)]
