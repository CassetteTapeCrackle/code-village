"""Which items the generated browser tests cover for a change, and the items file they read."""

import json
import os
import shutil
import subprocess
import tempfile
import unittest
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path
from unittest import mock

from vet.cache import _write, framework_hash
from vet.changed import changed_items, changed_paths, tokens_for
from vet.e2e_items import e2e_items, hidden_only_mutant, write_items
from vet.load import load_content

GOOD = Path(__file__).resolve().parent / "fixtures" / "good"
TASK = "content/w1/a/basics/tasks/double"


@contextmanager
def repo_with_content() -> Iterator[Path]:
    """A temporary repository whose content/ is the good fixture."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        shutil.copytree(GOOD, root / "content")
        yield root


def tokens(paths: list[str]) -> frozenset[str]:
    with repo_with_content() as root:
        content, _ = load_content(root / "content")
        return tokens_for(paths, content, root)


class Mapping(unittest.TestCase):
    def test_a_task_file_maps_to_its_task(self) -> None:
        self.assertEqual(tokens([f"{TASK}/solution.py"]), {"basics-double"})
        self.assertEqual(tokens([f"{TASK}/variants/quadruple/tests.py"]), {"basics-double"})

    def test_a_lesson_text_maps_to_every_task_of_the_lesson(self) -> None:
        expected = {"basics-double", "basics-half", "basics-triple"}
        self.assertEqual(tokens(["content/w1/a/basics/lesson.md"]), expected)
        self.assertEqual(tokens(["content/w1/a/basics/ledger.toml"]), expected)

    def test_a_boss_file_maps_to_its_boss(self) -> None:
        self.assertEqual(tokens(["content/w1/a/boss/stages/1-add/tests.py"]), {"calc"})

    def test_shared_content_and_the_runner_ask_for_a_sample(self) -> None:
        for path in ("content/features.toml", "content/w1/world.toml", "py/harness.py", "src/runner/worker.ts",
                     "src/lesson/TaskPanel.svelte", "tools/vet/run.py"):
            with self.subTest(path=path):
                self.assertEqual(tokens([path]), {"sample"})

    def test_the_generated_specs_ask_for_everything(self) -> None:
        self.assertEqual(tokens([f"{TASK}/solution.py", "py/harness.py", "e2e/generated.spec.ts"]), {"all"})

    def test_unrelated_files_ask_for_nothing(self) -> None:
        self.assertEqual(tokens(["docs/test-framework/PROGRESS.md", "worker/src/router.ts", "vet/gaps.toml"]), set())

    def test_changes_add_up(self) -> None:
        self.assertEqual(tokens([f"{TASK}/starter.py", "py/harness.py"]), {"basics-double", "sample"})


class Prefixes(unittest.TestCase):
    def test_a_task_folder_that_starts_like_another_is_not_confused_with_it(self) -> None:
        with repo_with_content() as root:
            tasks = root / "content/w1/a/basics/tasks"
            shutil.copytree(tasks / "double", tasks / "double-2")
            toml = tasks / "double-2" / "task.toml"
            toml.write_text(toml.read_text().replace('id = "basics-double"', 'id = "basics-double-2"'))
            shutil.rmtree(tasks / "double-2" / "variants")
            lesson = root / "content/w1/a/basics/lesson.md"
            lesson.write_text(lesson.read_text() + "\n::task double-2\n")
            content, _ = load_content(root / "content")
            self.assertEqual(tokens_for([f"{TASK}-2/solution.py"], content, root), {"basics-double-2"})
            self.assertEqual(tokens_for([f"{TASK}/solution.py"], content, root), {"basics-double"})


class Git(unittest.TestCase):
    def git(self, root: Path, *args: str) -> None:
        subprocess.run(["git", "-c", "user.email=t@t", "-c", "user.name=t", *args], cwd=root, check=True,
                       capture_output=True)

    def test_changed_paths_come_from_git_diff(self) -> None:
        with repo_with_content() as root:
            self.git(root, "init", "-q", "-b", "main")
            self.git(root, "add", "-A")
            self.git(root, "commit", "-q", "-m", "base")
            self.git(root, "switch", "-q", "-c", "work")
            (root / TASK / "solution.py").write_text("def double(n):\n    return 2 * n\n")
            self.git(root, "commit", "-q", "-am", "change")
            self.assertEqual(changed_paths("main", root), [f"{TASK}/solution.py"])
            self.assertEqual(changed_items("main", root), {"basics-double"})

    def test_histories_without_a_common_ancestor_are_compared_tree_to_tree(self) -> None:
        with repo_with_content() as root:
            self.git(root, "init", "-q", "-b", "main")
            self.git(root, "add", "-A")
            self.git(root, "commit", "-q", "-m", "base")
            self.git(root, "checkout", "-q", "--orphan", "merged")  # a shallow merge commit looks like this
            (root / TASK / "starter.py").write_text("def double(n):\n    return n\n")
            self.git(root, "add", "-A")
            self.git(root, "commit", "-q", "-m", "base plus change")
            self.assertEqual(changed_paths("main", root), [f"{TASK}/starter.py"])

    def test_changes_made_on_the_base_after_branching_are_not_ours(self) -> None:
        with repo_with_content() as root:
            self.git(root, "init", "-q", "-b", "main")
            self.git(root, "add", "-A")
            self.git(root, "commit", "-q", "-m", "base")
            self.git(root, "switch", "-q", "-c", "work")
            (root / TASK / "solution.py").write_text("def double(n):\n    return 2 * n\n")
            self.git(root, "commit", "-q", "-am", "ours")
            self.git(root, "switch", "-q", "main")
            (root / "content/w1/a/basics/tasks/half/solution.py").write_text("def half(n):\n    return n * 0.5\n")
            self.git(root, "commit", "-q", "-am", "theirs")
            self.git(root, "switch", "-q", "work")
            self.assertEqual(changed_paths("main", root), [f"{TASK}/solution.py"])  # not the half task: three dots

    def test_an_unknown_base_is_said(self) -> None:
        with repo_with_content() as root:
            self.git(root, "init", "-q")
            with self.assertRaisesRegex(ValueError, "fetch it first"):
                changed_paths("origin/nope", root)


class Items(unittest.TestCase):
    def test_tasks_and_bosses_are_listed_with_their_files(self) -> None:
        content, _ = load_content(GOOD)
        items = e2e_items(content)
        double = next(t for t in items["tasks"] if t["id"] == "basics-double")
        self.assertEqual((double["lesson"], double["title"]), ("basics", "Double it"))
        self.assertTrue(str(double["solution"]).endswith("tasks/double/solution.py"))
        self.assertTrue(str(double["wrong"]).endswith(".py"))
        self.assertIsNone(double["hiddenMutant"])
        [boss] = items["bosses"]
        self.assertEqual((boss["id"], boss["lessons"]), ("calc", ["basics"]))

    def test_a_mutant_only_the_hidden_cases_kill_is_named_from_the_cache(self) -> None:
        content, _ = load_content(GOOD)
        task = next(t for t in content.tasks if t.id == "basics-double")
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp) / "mutation"
            kills = [{"verdict": "visible", "code": "a"}, {"verdict": "hidden", "code": "b"},
                     {"verdict": "hidden", "code": "c"}]
            _write(folder, (task.fingerprint, task.id), framework_hash(), kills)
            with mock.patch.dict(os.environ, {"VET_CACHE": tmp}):
                self.assertEqual(hidden_only_mutant(content, task.fingerprint), "b")
                self.assertIsNone(hidden_only_mutant(content, "000000000000"))

    def test_the_file_is_written(self) -> None:
        content, _ = load_content(GOOD)
        with tempfile.TemporaryDirectory() as tmp:
            target = Path(tmp) / "nested" / "e2e-items.json"
            self.assertEqual(write_items(content, target), 4)
            self.assertEqual(len(json.loads(target.read_text())["tasks"]), 3)


if __name__ == "__main__":
    unittest.main()
