"""per_group(): a value per solution group, computed for misses only and stored when settled."""

import tempfile
import unittest
import unittest.mock
from collections.abc import Callable
from pathlib import Path

from test_canaries import FIXTURES
from vet.cache import VET, Computed, Group, framework_hash, per_group, result_files
from vet.load import load_content


class PerGroup(unittest.TestCase):
    def setUp(self) -> None:
        good, _ = load_content(FIXTURES / "good")
        self.groups = good.solution_groups()
        self.folder = Path(tempfile.mkdtemp())
        self.asked: list[list[str]] = []

    def compute(self, settled: bool) -> Callable[[list[Group]], list[Computed]]:
        def run(todo: list[Group]) -> list[Computed]:
            self.asked.append([g[0].id for g in todo])
            return [({"id": g[0].id}, settled) for g in todo]
        return run

    def test_a_second_run_reads_every_value_back(self) -> None:
        first = per_group(self.groups, self.folder, self.compute(True))
        again = per_group(self.groups, self.folder, self.compute(True))
        self.assertEqual(first, again)
        self.assertEqual(self.asked, [[g[0].id for g in self.groups], []])

    def test_unsettled_values_are_computed_again(self) -> None:
        per_group(self.groups, self.folder, self.compute(False))
        per_group(self.groups, self.folder, self.compute(False))
        self.assertEqual(len(self.asked[1]), len(self.groups))
        self.assertEqual(list(self.folder.glob("*.json")), [])

    def test_no_folder_means_no_cache(self) -> None:
        found = per_group(self.groups, None, self.compute(True))
        self.assertEqual(found, [{"id": g[0].id} for g in self.groups])


class FrameworkHash(unittest.TestCase):
    def test_result_code_is_in_the_key_and_other_framework_code_is_not(self) -> None:
        files = result_files()
        for needed in ["py/harness.py", "tools/vet/python/mutate.py", "tools/vet/python/rewrite.py",
                       "tools/vet/cases/generate.py", "tools/vet/checks/mutation.py"]:
            self.assertIn(VET.parents[1] / needed, files)
        for unrelated in ["tools/vet/gaps.py", "tools/vet/checks/hints.py", "tools/vet/run.py"]:
            self.assertNotIn(VET.parents[1] / unrelated, files)

    def test_other_pins_or_python_give_another_key(self) -> None:
        today = framework_hash()
        with unittest.mock.patch("vet.cache.library_pins", return_value="numpy==0.0.1"):
            self.assertNotEqual(framework_hash(), today)
        with unittest.mock.patch("vet.cache.sys.version", "3.12.0"):
            self.assertNotEqual(framework_hash(), today)


if __name__ == "__main__":
    unittest.main()
