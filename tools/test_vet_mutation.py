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
from vet.adapter import CaseInput, CaseValue, CheckJob, CheckOutcome
from vet.cache import CACHE_ROOT, cache_for
from vet.checks.mutation import group_results, summary
from vet.load import load_content
from vet.model import Content, Feature
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


class TimesOut(PythonAdapter):
    """An adapter on a machine so loaded that every Check runs out of time."""

    def check(self, jobs: Sequence[CheckJob]) -> list[CheckOutcome | None]:
        return [None for _ in jobs]


HIDDEN = 20


class NoFuzzValues(PythonAdapter):
    """An adapter whose solution runs out of time on the large fuzz set, but not on the hidden cases."""

    def expect(self, code: str, cases: Sequence[CaseInput]) -> list[CaseValue] | None:
        # the canary's hidden cases are 20 inputs, its fuzz set all 201 in int -100..100
        return None if len(cases) > HIDDEN else super().expect(code, cases)


class Verdicts(unittest.TestCase):
    def test_equivalent_mutants_are_listed_not_reported(self) -> None:
        found = verdicts(canary_content("equivalent-mutant-is-not-a-finding"), "basics-triple")
        self.assertGreaterEqual(found["equivalent"], 2)
        self.assertEqual(found["survived"], 0)

    def test_mutants_killed_only_by_hidden_cases_are_counted(self) -> None:
        good, _ = load_content(FIXTURES / "good")
        self.assertEqual(verdicts(good, "basics-half")["hidden"], 2)

    def test_a_required_construct_does_not_kill_mutants(self) -> None:
        # a mutant that loses the construct must stay a survivor: the tests, not the construct check, should catch it
        content = canary_content("tests-miss-a-boundary")
        before = verdicts(content, "basics-triple")
        next(t for t in content.tasks if t.id == "basics-triple").meta["requires"] = ["use-abs"]
        content.features["use-abs"] = Feature("use-abs", "", ("call:abs",), (), "use abs")
        self.assertEqual(verdicts(content, "basics-triple"), before)
        self.assertGreater(before["survived"], 0)

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

    def test_a_mutant_that_runs_out_of_time_is_killed_and_cached(self) -> None:
        good, _ = load_content(FIXTURES / "good")
        cache = Path(tempfile.mkdtemp())
        results = group_results(good, TimesOut(), cache)
        self.assertTrue(all(r.verdict == "visible" for _, rs in results for r in rs))
        self.assertEqual(len(list(cache.glob("*.json"))), len(results))

    def test_a_fuzz_set_that_cannot_be_built_is_said_and_not_cached(self) -> None:
        content = canary_content("fuzz-finds-a-difference")
        cache = Path(tempfile.mkdtemp())
        [(group, results)] = [(g, rs) for g, rs in group_results(content, NoFuzzValues(), cache)
                              if g[0].id == "basics-triple"]
        survived = [r for r in results if r.verdict == "survived"]
        self.assertTrue(survived)
        self.assertTrue(all("fuzz inputs could not be built" in r.differs for r in survived))
        self.assertFalse((cache / f"{group[0].fingerprint}.json").exists())

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
        real, _ = load_content(CACHE_ROOT.parent / "content")
        good, _ = load_content(FIXTURES / "good")
        self.assertEqual(cache_for(real, "mutation"), CACHE_ROOT / "mutation")
        with unittest.mock.patch.dict(os.environ, {"VET_CACHE": "/tmp/shared"}):
            self.assertEqual(cache_for(good, "rewrites"), Path("/tmp/shared/rewrites"))
        with unittest.mock.patch.dict(os.environ, clear=True):
            self.assertIsNone(cache_for(good, "mutation"))


if __name__ == "__main__":
    unittest.main()
