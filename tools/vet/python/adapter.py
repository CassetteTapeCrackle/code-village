"""PythonAdapter: runs py/harness.py in subprocesses, several at once."""

import json
import os
import subprocess
import sys
from collections.abc import Sequence
from concurrent.futures import ThreadPoolExecutor
from dataclasses import asdict
from pathlib import Path
from typing import cast

from ..adapter import CaseInput, CaseValue, CheckJob, CheckOutcome, Mutant, Rewrite, RunOutcome

ROOT = Path(__file__).resolve().parents[3]
HARNESS = ROOT / "py" / "harness.py"
# a guard against runaway loops, not a speed budget: World 3 runs take ~2 s alone but 10+ s on a loaded machine
LIMIT = 30
# one maths thread per job: the jobs already run side by side, one per CPU
ONE_THREAD = {"OMP_NUM_THREADS": "1", "OPENBLAS_NUM_THREADS": "1"}

Job = dict[str, object]


class PythonAdapter:
    extension = ".py"

    def __init__(self, python: Path | None = None) -> None:
        self.python = str(python) if python else sys.executable

    def run(self, codes: Sequence[str]) -> list[RunOutcome | None]:
        jobs: list[Job] = [{"mode": "run", "code": code, "inputs": []} for code in codes]
        return [cast(RunOutcome | None, outcome) for outcome in self._harness_all(jobs)]

    def check(self, jobs: Sequence[CheckJob]) -> list[CheckOutcome | None]:
        harness_jobs: list[Job] = [{"mode": "check", **asdict(job)} for job in jobs]
        return [cast(CheckOutcome | None, outcome) for outcome in self._harness_all(harness_jobs)]

    def expect(self, code: str, cases: Sequence[CaseInput]) -> list[CaseValue]:
        raise NotImplementedError(f"hidden cases arrive in Task 2.3 (asked for {len(cases)})")

    def mutants(self, code: str) -> list[Mutant]:
        raise NotImplementedError("mutants arrive in Task 3.1")

    def rewrites(self, code: str) -> list[Rewrite]:
        raise NotImplementedError("rewrites arrive in Task 3.3")

    def features(self, code: str) -> frozenset[str]:
        raise NotImplementedError("feature detection arrives in Task 5.1")

    def _harness_all(self, jobs: Sequence[Job]) -> list[dict[str, object] | None]:
        # the jobs are subprocesses, so threads run them side by side
        with ThreadPoolExecutor(max_workers=os.cpu_count() or 4) as pool:
            return list(pool.map(self._harness, jobs))

    def _harness(self, job: Job) -> dict[str, object] | None:
        try:
            done = subprocess.run([self.python, "-I", str(HARNESS)], input=json.dumps(job), capture_output=True,
                                  text=True, timeout=LIMIT, env={**os.environ, **ONE_THREAD}, check=False)
        except subprocess.TimeoutExpired:
            return None
        if done.returncode != 0:  # e.g. the task's own tests.py has a syntax error
            last = (done.stderr.strip().splitlines() or ["no output"])[-1]
            return {"stdout": "", "error": f"the harness crashed: {last}", "results": []}
        result: dict[str, object] = json.loads(done.stdout)
        return result
