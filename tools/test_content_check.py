import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GOOD = ROOT / "tools" / "fixtures" / "good"


def check(content_dir):
    out = Path(tempfile.mkdtemp()) / "bundle.json"
    done = subprocess.run([sys.executable, "tools/content_check.py", "--content", str(content_dir), "--out", str(out),
                           "--no-version-check"], cwd=ROOT, capture_output=True, text=True, timeout=180)
    return done, out


def broken_copy(edit):
    """A copy of the good fixtures; edit gets the lesson folder (its parent holds the boss)."""
    tmp = Path(tempfile.mkdtemp()) / "content"
    shutil.copytree(GOOD, tmp)
    edit(tmp / "w1" / "a" / "basics")
    return tmp


class ContentCheck(unittest.TestCase):
    def test_good_content_builds_a_bundle(self):
        done, out = check(GOOD)
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        bundle = json.loads(out.read_text())
        self.assertEqual(bundle["version"], 2)
        lesson = bundle["lessons"][0]
        self.assertEqual([b["type"] for b in lesson["blocks"]], ["text", "example", "predict", "task", "task", "task"])
        self.assertEqual(lesson["blocks"][1]["output"], "42\n")
        self.assertEqual(lesson["blocks"][2]["output"], "9\n")
        double = lesson["blocks"][3]["task"]
        self.assertEqual([v["id"] for v in double["variants"]], ["basics-double-quadruple"])
        self.assertEqual(double["variants"][0]["concept"], "numbers")
        boss = bundle["bosses"][0]
        self.assertEqual([s["id"] for s in boss["stages"]], ["calc-add", "calc-sub", "calc-mul"])
        self.assertEqual((boss["hardChecks"], boss["intro"]), (3, "Build a tiny calculator."))
        self.assertNotIn("solution", json.dumps(bundle))

    def test_wrong_solution_fails_the_build(self):
        content = broken_copy(lambda d: (d / "tasks/double/solution.py").write_text("def double(n):\n    return n\n"))
        done, _ = check(content)
        self.assertEqual(done.returncode, 1)
        self.assertIn("basics-double: the solution fails", done.stdout)

    def test_trivial_starter_fails_the_build(self):
        content = broken_copy(lambda d: (d / "tasks/double/starter.py").write_text("def double(n):\n    return n * 2\n"))
        done, _ = check(content)
        self.assertIn("basics-double: the starter already passes", done.stdout)

    def test_unused_task_folder_fails(self):
        def edit(d):
            text = (d / "lesson.md").read_text().replace("::task triple\n", "")
            (d / "lesson.md").write_text(text)
        done, _ = check(broken_copy(edit))
        self.assertIn("task folder triple is never placed", done.stdout)

    def test_concept_without_gotcha_fails(self):
        def edit(d):
            p = d / "tasks/double/task.toml"
            p.write_text(p.read_text().replace("gotcha = true", "gotcha = false"))
        done, _ = check(broken_copy(edit))
        self.assertIn("concept numbers has no gotcha task", done.stdout)

    def test_infinite_example_fails_instead_of_hanging(self):
        def edit(d):
            text = (d / "lesson.md").read_text().replace("print(2 * 21)", "while True:\n    pass")
            (d / "lesson.md").write_text(text)
        done, _ = check(broken_copy(edit))
        self.assertIn("ran longer than 30 s", done.stdout)

    def test_broken_variant_fails(self):
        content = broken_copy(lambda d: (d / "tasks/double/variants/quadruple/solution.py").write_text(
            "def quadruple(n):\n    return n * 2\n"))
        done, _ = check(content)
        self.assertIn("basics-double-quadruple: the solution fails", done.stdout)

    def test_boss_solution_must_pass_every_stage(self):
        def edit(d):
            p = d.parent / "boss" / "solution.py"
            p.write_text(p.read_text().replace("return a - b", "return a + b"))
        done, _ = check(broken_copy(edit))
        self.assertIn("calc: the solution (stage calc-sub) fails", done.stdout)

    def test_boss_needs_three_stages(self):
        done, _ = check(broken_copy(lambda d: shutil.rmtree(d.parent / "boss" / "stages" / "3-mul")))
        self.assertIn("a boss needs 3 to 5 stages, found 2", done.stdout)

    def test_boss_in_a_region_without_lessons_fails(self):
        def edit(d):
            p = d.parent / "boss" / "boss.md"
            p.write_text(p.read_text().replace('region = "a"', 'region = "z"'))
        done, _ = check(broken_copy(edit))
        self.assertIn("region w1/z has no lessons", done.stdout)


    def test_false_claim_fails(self):
        def edit(d):
            text = (d / "lesson.md").read_text().replace("assert 2 * 21 == 42", "assert 2 * 21 == 43")
            (d / "lesson.md").write_text(text)
        done, _ = check(broken_copy(edit))
        self.assertIn("basics: a claim is false", done.stdout)

    def test_claim_without_assert_fails(self):
        def edit(d):
            text = (d / "lesson.md").read_text().replace("assert 2 * 21 == 42", "print(2 * 21)")
            (d / "lesson.md").write_text(text)
        done, _ = check(broken_copy(edit))
        self.assertIn("basics: a claim block needs an assert", done.stdout)

    def test_wrong_solution_the_tests_miss_fails(self):
        def edit(d):
            (d / "tasks/double/wrong/abs.py").write_text("def double(n):\n    return abs(n) * 2\n")
        done, _ = check(broken_copy(edit))
        self.assertIn("basics-double: wrong/abs.py passes every test", done.stdout)

    def test_wrong_boss_solution_the_tests_miss_fails(self):
        def edit(d):
            boss = d.parent / "boss"
            (boss / "wrong").mkdir()
            (boss / "wrong" / "same.py").write_text((boss / "solution.py").read_text())
        done, _ = check(broken_copy(edit))
        self.assertIn("calc: wrong/same.py passes every test", done.stdout)

    def test_solution_breaking_a_lint_rule_fails(self):
        def edit(d):
            p = d / "tasks/double/solution.py"
            p.write_text("import os\n" + p.read_text())
        done, _ = check(broken_copy(edit))
        self.assertIn("w1/a/basics/tasks/double/solution.py: the solution breaks a lint rule", done.stdout)
        self.assertIn("F401", done.stdout)

    def test_broken_hint_code_fails(self):
        def edit(lesson):
            toml = lesson / "tasks" / "double" / "task.toml"
            toml.write_text(toml.read_text().replace('hints = ["Multiply by 2."]', 'hints = ["Try `print(n * 2`."]'))
        done, _ = check(broken_copy(edit))
        self.assertNotEqual(done.returncode, 0)
        self.assertIn("hint code is not valid Python: `print(n * 2`", done.stdout + done.stderr)

    def test_broken_multiline_hint_code_fails(self):
        def edit(lesson):
            toml = lesson / "tasks" / "double" / "task.toml"
            toml.write_text(toml.read_text().replace('hints = ["Multiply by 2."]', r'hints = ["Try `for i in range(3\nprint(i)`."]'))
        done, _ = check(broken_copy(edit))
        self.assertNotEqual(done.returncode, 0)
        self.assertIn("hint code is not valid Python: `for i in range(3\nprint(i)`", done.stdout + done.stderr)

    def test_hint_quoting_the_solution_fails(self):
        def edit(lesson):
            toml = lesson / "tasks" / "double" / "task.toml"
            toml.write_text(toml.read_text().replace('hints = ["Multiply by 2."]', 'hints = ["Try `return n * 2`."]'))
        done, _ = check(broken_copy(edit))
        self.assertEqual(done.returncode, 1)
        self.assertIn("basics-double: hint 1 gives away the solution: `return n * 2`", done.stdout)

    def test_hint_with_different_names_passes(self):
        def edit(lesson):
            toml = lesson / "tasks" / "double" / "task.toml"
            toml.write_text(toml.read_text().replace('hints = ["Multiply by 2."]', 'hints = ["Try `return x * 2`."]'))
        done, _ = check(broken_copy(edit))
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)

    def test_starter_line_and_short_line_in_a_hint_pass(self):
        def edit(lesson):
            toml = lesson / "tasks" / "double" / "task.toml"
            toml.write_text(toml.read_text().replace('hints = ["Multiply by 2."]', 'hints = ["Keep `def double(n):`, and `pass` is fine."]'))
        done, _ = check(broken_copy(edit))
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)

    def test_non_string_hint_fails_cleanly(self):
        def edit(lesson):
            toml = lesson / "tasks" / "double" / "task.toml"
            toml.write_text(toml.read_text().replace('hints = ["Multiply by 2."]', "hints = [42]"))
        done, _ = check(broken_copy(edit))
        self.assertNotEqual(done.returncode, 0)
        self.assertIn("basics-double: a hint must be a string", done.stdout + done.stderr)

    def test_hint_fragments_and_prose_pass(self):
        sys.path.insert(0, str(ROOT / "tools"))
        from content_check import hint_code_compiles, looks_like_code
        # every fragment style found in real hints on 2026-10-15
        for span in ["elif n < 0:", "if n > 0", "return total", "else:", "except ValueError:", "break", "{'a': 1}",
                     "f'{name}!'", "n % 2 == 0", "xs.append(x)", "for x in xs:", "try: return a / b",
                     "except ZeroDivisionError: return None", "is None", "{total:.2f}", "elif age < 65: return 9",
                     "@dataclass(order=True)", ".copy()", "==", "*", ".tolist()", "key=",
                     '"std": round(float(np.std(values, ddof=0)), 2),', "for i in range(3):\n    print(i)"]:
            self.assertTrue(hint_code_compiles(span), span)
        for broken in ["print(n * 2", "if n > (0", "return (x", "xs.append(x", "for x in", "def f(:", "x = = 1", "{total:.2f", "for i in range(3\n    print(i)",
                       "x = 1 +", "total = total +", "y = x *", "print(x) +", "not x ==", "x, y ="]:
            self.assertFalse(hint_code_compiles(broken), broken)
        for prose in ["if", "tests.py", "None"]:
            self.assertFalse(looks_like_code(prose) and not hint_code_compiles(prose), prose)


class Libraries(unittest.TestCase):
    def test_library_versions_must_match_pyodide(self):
        from unittest import mock
        sys.path.insert(0, str(ROOT / "tools"))
        import content_check

        versions = {"numpy": "2.4.6", "pandas": "3.0.0", "scikit-learn": "1.8.0"}
        problems = content_check.Problems()
        with mock.patch("importlib.metadata.version", side_effect=lambda name: versions[name]):
            content_check.check_libraries(problems)
        self.assertEqual(problems, ["libraries: pandas is 3.0.0 here, Pyodide ships 3.0.2: run the check with pnpm content"])

    def test_if_changed_skips_until_the_content_changes(self):
        content = broken_copy(lambda lesson: None)
        out = Path(tempfile.mkdtemp()) / "bundle.json"
        run = [sys.executable, "tools/content_check.py", "--content", str(content), "--out", str(out), "--no-version-check", "--if-changed"]
        first = subprocess.run(run, cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertIn("content ok", first.stdout, first.stdout + first.stderr)
        again = subprocess.run(run, cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertIn("content unchanged", again.stdout)
        lesson = content / "w1" / "a" / "basics" / "lesson.md"
        lesson.write_text(lesson.read_text() + "\nOne more line.\n")
        edited = subprocess.run(run, cwd=ROOT, capture_output=True, text=True, timeout=180)
        self.assertIn("content ok", edited.stdout, edited.stdout + edited.stderr)


if __name__ == "__main__":
    unittest.main()
