"""The Pyodide parity run: CPython's verdicts written by --jobs-out, repeated by scripts/vet-pyodide.mjs."""

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from collections import Counter
from pathlib import Path

from test_canaries import FIXTURES

ROOT = Path(__file__).resolve().parent.parent
# starting a thread works in CPython and raises RuntimeError in Pyodide (verified on 314.0.7)
THREAD_CLAIM = ("```python claim id=thread\nimport threading\nthread = threading.Thread(target=print)\nthread.start()\n"
                "thread.join()\nassert not thread.is_alive()\n```\n\n")


def jobs_for(content: Path) -> Path:
    out = Path(tempfile.mkdtemp())
    command = [sys.executable, "tools/content_check.py", "--content", str(content), "--out", str(out / "b.json"),
               "--no-version-check", "--quick", "--jobs-out", str(out / "jobs.json")]
    done = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=300, check=False)
    if done.returncode != 0:
        raise AssertionError(done.stdout + done.stderr)
    return out / "jobs.json"


def in_pyodide(jobs: Path) -> subprocess.CompletedProcess[str]:
    command = ["node", "--stack-size=4000", "scripts/vet-pyodide.mjs", str(jobs)]  # as pnpm vet:pyodide runs it
    return subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=300, check=False)


class Parity(unittest.TestCase):
    def test_jobs_hold_every_kind_of_verdict(self) -> None:
        data = json.loads(jobs_for(FIXTURES / "good").read_text())
        self.assertEqual(data["pins"], {"numpy": "2.4.6", "pandas": "3.0.2", "scikit-learn": "1.8.0"})
        jobs = {job["id"]: job for job in data["jobs"]}
        self.assertEqual(Counter(job["kind"] for job in data["jobs"])["claim"], 1)
        self.assertEqual(jobs["basics-double:the solution"]["expect"], "pass")
        self.assertEqual(jobs["basics-double:the starter"]["expect"], "fail")
        self.assertEqual(len(jobs["basics-double:expect"]["expect"]["values"]), 100)

    def test_the_good_fixture_agrees_in_pyodide(self) -> None:
        done = in_pyodide(jobs_for(FIXTURES / "good"))
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)

    def test_a_claim_that_holds_only_in_cpython_fails(self) -> None:
        content = Path(tempfile.mkdtemp()) / "content"
        shutil.copytree(FIXTURES / "good", content)
        lesson = content / "w1/a/basics/lesson.md"
        lesson.write_text(lesson.read_text().replace("```python example", THREAD_CLAIM + "```python example"))
        done = in_pyodide(jobs_for(content))
        self.assertEqual(done.returncode, 1, done.stdout + done.stderr)
        self.assertIn('w1/a/basics:block1: CPython gives "pass", Pyodide "fail"', done.stdout)
        self.assertIn("1 problem(s)", done.stdout)

    def test_a_pin_pyodide_does_not_ship_fails(self) -> None:
        jobs = Path(tempfile.mkdtemp()) / "jobs.json"
        jobs.write_text(json.dumps({"pins": {"numpy": "0.0.1"}, "jobs": []}))
        done = in_pyodide(jobs)
        self.assertEqual(done.returncode, 1)
        self.assertIn("libraries: Pyodide ships numpy 2.4.6, pnpm content pins 0.0.1", done.stdout)


if __name__ == "__main__":
    unittest.main()
