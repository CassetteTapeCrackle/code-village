"""The mutation check: verdicts per mutant, the results cache, and the build summary."""

import json
import os
import tempfile
import unittest
import unittest.mock
from collections import Counter
from collections.abc import Sequence
from pathlib import Path

from test_canaries import CANARIES, FIXTURES, materialize
from vet.adapter import CheckJob, CheckOutcome
from vet.checks.mutation import CACHE, cache_for, group_results, summary
from vet.load import load_content
from vet.model import Content
from vet.python.adapter import PythonAdapter


def canary_content(name: str) -> Content:
    content, _ = load_content(materialize(CANARIES / "weak-tests" / name, Path(tempfile.mkdtemp())))
    return content


def verdicts(content: Content, item: str, cache: Path | None = None) -> Counter[str]:
    [results] = [rs for group, rs in group_results(content, PythonAdapter(), cache) if group[0].id == item]
    return Counter(r.verdict for r in results)


class NoChecks(PythonAdapter):
    """An adapter that refuses to run anything, to prove results came from the cache."""

    def check(self, jobs: Sequence[CheckJob]) -> list[CheckOutcome | None]:
        if jobs:
            raise AssertionError("the cache should have answered")
        return []


class Verdicts(unittest.TestCase):
    def test_equivalent_mutants_are_listed_not_reported(self) -> None:
        found = verdicts(canary_content("equivalent-mutant-is-not-a-finding"), "basics-triple")
        self.assertGreaterEqual(found["equivalent"], 2)
        self.assertEqual(found["survived"], 0)

    def test_mutants_killed_only_by_hidden_cases_are_counted(self) -> None:
        good, _ = load_content(FIXTURES / "good")
        self.assertEqual(verdicts(good, "basics-half")["hidden"], 2)

    def test_boss_mutants_count_every_stage(self) -> None:
        # a mutant of mul survives the add and sub stages, so only the stage that tests mul can kill it
        good, _ = load_content(FIXTURES / "good")
        self.assertEqual(verdicts(good, "calc")["survived"], 0)


class Cache(unittest.TestCase):
    def test_results_are_read_back_from_the_cache(self) -> None:
        good, _ = load_content(FIXTURES / "good")
        cache = Path(tempfile.mkdtemp())
        first = group_results(good, PythonAdapter(), cache)
        again = group_results(good, NoChecks(), cache)
        self.assertEqual([rs for _, rs in first], [rs for _, rs in again])
        self.assertIn("mutants: 65, killed by visible tests 62, only by hidden cases 3", summary(good, cache))

    def test_a_cache_from_another_framework_is_ignored(self) -> None:
        good, _ = load_content(FIXTURES / "good")
        cache = Path(tempfile.mkdtemp())
        group_results(good, PythonAdapter(), cache)
        for path in cache.glob("*.json"):
            data = json.loads(path.read_text())
            path.write_text(json.dumps({**data, "framework": "older"}))
        with self.assertRaises(AssertionError):
            group_results(good, NoChecks(), cache)
        self.assertEqual(summary(good, Path(tempfile.mkdtemp())).split(",")[0], "mutants: 0")

    def test_cache_folder_for_real_content_and_for_tests(self) -> None:
        real, _ = load_content(CACHE.parents[1] / "content")
        good, _ = load_content(FIXTURES / "good")
        self.assertEqual(cache_for(real), CACHE)
        with unittest.mock.patch.dict(os.environ, {"VET_CACHE": "/tmp/shared"}):
            self.assertEqual(cache_for(good), Path("/tmp/shared/mutation"))
        with unittest.mock.patch.dict(os.environ, clear=True):
            self.assertIsNone(cache_for(good))


if __name__ == "__main__":
    unittest.main()
