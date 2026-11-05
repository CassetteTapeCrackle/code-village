"""Re-pinning an edited item's gaps and blind run."""

import json
import shutil
import tempfile
import unittest
from pathlib import Path

from vet.blind_eval import judge_attempt
from vet.finding import GapKey
from vet.load import load_content
from vet.python.adapter import PythonAdapter
from vet.repin import fingerprints_of, refresh_blind, repin_gaps

GOOD = Path(__file__).resolve().parent / "fixtures" / "good"
RIGHT = "def double(n):\n    return n * 2\n"


class Gaps(unittest.TestCase):
    GAPS = (GapKey("cases-missing", "a", "old"), GapKey("weak-tests", "a", "old"), GapKey("cases-missing", "b", "keep"))

    def test_the_named_items_move_to_their_new_fingerprint(self) -> None:
        found = repin_gaps(self.GAPS, {"a": "new"}, frozenset())
        self.assertEqual(found, {GapKey("cases-missing", "a", "new"), GapKey("weak-tests", "a", "new"),
                                 GapKey("cases-missing", "b", "keep")})

    def test_a_fixed_rule_is_dropped(self) -> None:
        found = repin_gaps(self.GAPS, {"a": "new"}, frozenset({"weak-tests"}))
        self.assertNotIn(GapKey("weak-tests", "a", "new"), found)
        self.assertIn(GapKey("cases-missing", "a", "new"), found)

    def test_other_items_are_left_alone(self) -> None:
        self.assertIn(GapKey("cases-missing", "b", "keep"), repin_gaps(self.GAPS, {"a": "new"}, frozenset()))

    def test_an_unknown_id_is_named(self) -> None:
        content, _ = load_content(GOOD)
        with self.assertRaisesRegex(KeyError, "nope"):
            fingerprints_of(content, ["nope"])


class Blind(unittest.TestCase):
    def test_stored_attempts_are_judged_again_against_the_new_tests(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            content_dir = Path(tmp) / "content"
            shutil.copytree(GOOD, content_dir)
            folder = Path(tmp) / "blind"
            folder.mkdir()
            content, _ = load_content(content_dir)
            group = next(g for g in content.solution_groups() if g[0].id == "basics-double")
            attempt = judge_attempt(group, RIGHT, PythonAdapter()) | {"temperature": 0.2}
            kept = {"attempt": 0, "decision": "test-fixed", "by": "owner", "note": "n"}
            (folder / "basics-double.json").write_text(json.dumps(
                {"fingerprint": "old", "attempts": [attempt], "triage": [kept]}))
            tests = content_dir / "w1/a/basics/tasks/double/tests.py"
            extra = "\ndef test_extra():\n    expect_equal(learner['double'](7), 15, 'x')\n"
            before, _ = load_content(content_dir)
            tests.write_text(tests.read_text() + extra)
            content, _ = load_content(content_dir)
            self.assertEqual(refresh_blind(content, before, folder, ["basics-double"]), (["basics-double"], []))
            after = json.loads((folder / "basics-double.json").read_text())
        self.assertNotEqual(after["fingerprint"], "old")
        self.assertEqual(after["attempts"][0]["visible"], "fail")  # the correct answer fails the wrong new test
        self.assertEqual(after["triage"], [kept])

    def test_a_changed_question_leaves_the_run_stale(self) -> None:
        for edit in ("starter.py", "task.toml"):
            with self.subTest(edit=edit), tempfile.TemporaryDirectory() as tmp:
                content_dir = Path(tmp) / "content"
                shutil.copytree(GOOD, content_dir)
                folder = Path(tmp) / "blind"
                folder.mkdir()
                before, _ = load_content(content_dir)
                group = next(g for g in before.solution_groups() if g[0].id == "basics-double")
                attempt = judge_attempt(group, RIGHT, PythonAdapter()) | {"temperature": 0.2}
                stored = json.dumps({"fingerprint": "old", "attempts": [attempt], "triage": []})
                (folder / "basics-double.json").write_text(stored)
                path = content_dir / "w1/a/basics/tasks/double" / edit
                path.write_text(path.read_text().replace("Write `double(n)`.", "Write `double(n)` for any number.")
                                if edit == "task.toml" else path.read_text() + "# a new line in the starter\n")
                content, _ = load_content(content_dir)
                self.assertEqual(refresh_blind(content, before, folder, ["basics-double"]), ([], ["basics-double"]))
                self.assertEqual((folder / "basics-double.json").read_text(), stored)


if __name__ == "__main__":
    unittest.main()
