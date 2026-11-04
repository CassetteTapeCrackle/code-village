import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from collections.abc import Callable
from pathlib import Path
from unittest import mock

from ledger_fixture import sync_ledger
from vet import GapKey, vet
from vet.checks.hints import hint_code_compiles, hint_problems, looks_like_code
from vet.checks.libraries import library_problems
from vet.gaps import dump_gaps

ROOT = Path(__file__).resolve().parent.parent
GOOD = ROOT / "tools" / "fixtures" / "good"


def check(content_dir: Path, *extra: str) -> tuple[subprocess.CompletedProcess[str], Path]:
    out = Path(tempfile.mkdtemp()) / "bundle.json"
    command = [sys.executable, "tools/content_check.py", "--content", str(content_dir), "--out", str(out),
               "--no-version-check", *extra]
    done = subprocess.run(command, cwd=ROOT, capture_output=True, text=True, timeout=180, check=False)
    return done, out


def messages(hints: list[object], solution: str, starter: str) -> list[str]:
    return [message for _, message in hint_problems(hints, solution, starter)]


def broken_copy(edit: Callable[[Path], object]) -> Path:
    """A copy of the good fixtures; edit gets the lesson folder (its parent holds the boss)."""
    tmp = Path(tempfile.mkdtemp()) / "content"
    shutil.copytree(GOOD, tmp)
    edit(tmp / "w1" / "a" / "basics")
    sync_ledger(tmp)
    return tmp


class ContentCheck(unittest.TestCase):
    def test_required_constructs_reach_the_bundle(self) -> None:
        def require_lambda(lesson: Path) -> None:
            root = lesson.parents[2]
            (root / "features.toml").write_text((root / "features.toml").read_text() + (
                '\n[feature.lambda]\nsummary = "lambda"\ndetect = ["node:Lambda"]\nwords = ["lambda"]\n'
                'say = "use a lambda"\n'))
            text = (lesson / "lesson.md").read_text()
            (lesson / "lesson.md").write_text(text.replace('"fn-sum"]', '"fn-sum", "lambda"]'))
            double = lesson / "tasks" / "double"
            toml = (double / "task.toml").read_text().replace("Write `double(n)`.", "Write `double(n)` as a lambda.")
            (double / "task.toml").write_text('requires = ["lambda"]\n' + toml)
            (double / "solution.py").write_text("def double(n):\n    return (lambda x: x * 2)(n)\n")

        done, out = check(broken_copy(require_lambda), "--quick")
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        bundle = json.loads(out.read_text())
        double = bundle["lessons"][0]["blocks"][3]["task"]
        self.assertEqual(double["requires"], [{"id": "lambda", "detect": ["node:Lambda"], "say": "use a lambda"}])
        self.assertEqual(double["variants"][0]["requires"], [])
        self.assertEqual(bundle["bosses"][0]["hardRequires"], [])
        self.assertEqual(bundle["bosses"][0]["stages"][0]["requires"], [])

    def test_good_content_builds_a_bundle(self) -> None:
        done, out = check(GOOD)
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        bundle = json.loads(out.read_text())
        self.assertEqual(bundle["version"], 5)
        self.assertEqual(bundle["concepts"], {"numbers": "numbers"})
        self.assertEqual(bundle["worlds"][0]["building"], {"name": "School", "placeId": "school"})
        self.assertIsNone(bundle["worlds"][0]["key"])
        lesson = bundle["lessons"][0]
        self.assertEqual([b["type"] for b in lesson["blocks"]], ["text", "example", "predict", "task", "task", "task"])
        self.assertEqual(lesson["blocks"][1]["output"], "42\n")
        self.assertEqual(lesson["blocks"][2]["output"], "9\n")
        double = lesson["blocks"][3]["task"]
        self.assertEqual([v["id"] for v in double["variants"]], ["basics-double-quadruple"])
        self.assertEqual(double["variants"][0]["concept"], "numbers")
        self.assertIs(double["strict"], True)
        self.assertIs(double["variants"][0]["strict"], False)
        boss = bundle["bosses"][0]
        self.assertEqual([s["id"] for s in boss["stages"]], ["calc-add", "calc-sub", "calc-mul"])
        self.assertEqual((boss["hardChecks"], boss["intro"]), (3, "Build a tiny calculator."))
        self.assertNotIn("solution", json.dumps(bundle))

    def test_bundle_ships_hidden_cases(self) -> None:
        done, out = check(GOOD)
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        bundle = json.loads(out.read_text())
        double = bundle["lessons"][0]["blocks"][3]["task"]
        self.assertEqual(len(double["cases"]), 100)
        self.assertEqual(double["cases"][0], {"kind": "expr", "show": "double(-50)", "setup": "",
                                              "expr": "double(-50)", "expect": "-100", "raises": None,
                                              "compare": "exact"})
        self.assertEqual(len(double["variants"][0]["cases"]), 100)
        boss = bundle["bosses"][0]
        self.assertEqual(boss["stages"][0]["cases"][0]["show"], "add(-50, -50)")
        self.assertEqual(boss["hardCases"][0]["expect"], "0")

    def test_bundle_holds_no_solution_text(self) -> None:
        done, out = check(GOOD)
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        bundle = out.read_text()
        for solution in GOOD.rglob("solution.py"):
            starter = (solution.parent / "starter.py").read_text()
            distinctive = [line.strip() for line in solution.read_text().splitlines()
                           if line.strip() and line.strip() not in starter]
            self.assertTrue(distinctive, solution)
            for line in distinctive:
                with self.subTest(solution=str(solution.relative_to(GOOD)), line=line):
                    self.assertNotIn(line, bundle)

    def test_strict_must_be_a_bool(self) -> None:
        def edit(d: Path) -> None:
            p = d / "tasks/double/task.toml"
            p.write_text(p.read_text().replace("strict = true", 'strict = "yes"'))

        done, _ = check(broken_copy(edit))
        self.assertIn("strict must be true or false", done.stdout)

    def test_a_tour_lesson_is_flagged_and_kept_in_the_bundle(self) -> None:
        def mark_tour(d: Path) -> None:
            p = d / "lesson.md"
            p.write_text(p.read_text().replace("order = 1\n", "order = 1\ntour = true\n"))

        done, out = check(broken_copy(mark_tour))
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        lesson = json.loads(out.read_text())["lessons"][0]
        self.assertIs(lesson["tour"], True)

    def test_a_tour_flag_must_be_a_bool(self) -> None:
        def bad_tour(d: Path) -> None:
            p = d / "lesson.md"
            p.write_text(p.read_text().replace("order = 1\n", 'order = 1\ntour = "yes"\n'))

        done, _ = check(broken_copy(bad_tour))
        self.assertIn("tour must be true or false", done.stdout)

    def test_world_folder_without_world_toml_fails(self) -> None:
        done, _ = check(broken_copy(lambda d: (d.parents[1] / "world.toml").unlink()))
        self.assertIn("w1/world.toml: missing", done.stdout)

    def test_region_without_a_name_fails(self) -> None:
        def drop_region(d: Path) -> None:
            toml = d.parents[1] / "world.toml"
            toml.write_text(toml.read_text().replace('regions = { a = "Basics" }', 'regions = { b = "Other" }'))
        done, _ = check(broken_copy(drop_region))
        self.assertIn("region a has no name in w1/world.toml", done.stdout)

    def test_first_world_with_a_key_fails(self) -> None:
        def add_key(d: Path) -> None:
            toml = d.parents[1] / "world.toml"
            toml.write_text(toml.read_text() + '\n[key]\nboss = "calc"\ntrophy = "calc-trophy"\ntrophy_name = "T"\n'
                            'opens = "o"\ngate_hint = "h"\n')
        done, _ = check(broken_copy(add_key))
        self.assertIn("the first world must have no [key]", done.stdout)

    def test_wrong_solution_fails_the_build(self) -> None:
        content = broken_copy(lambda d: (d / "tasks/double/solution.py").write_text("def double(n):\n    return n\n"))
        done, _ = check(content)
        self.assertEqual(done.returncode, 1)
        self.assertIn("basics-double: the solution fails", done.stdout)

    def test_trivial_starter_fails_the_build(self) -> None:
        trivial = "def double(n):\n    return n * 2\n"
        content = broken_copy(lambda d: (d / "tasks/double/starter.py").write_text(trivial))
        done, _ = check(content)
        self.assertIn("basics-double: the starter already passes", done.stdout)

    def test_unused_task_folder_fails(self) -> None:
        def edit(d: Path) -> None:
            text = (d / "lesson.md").read_text().replace("::task triple\n", "")
            (d / "lesson.md").write_text(text)
        done, _ = check(broken_copy(edit))
        self.assertIn("task folder triple is never placed", done.stdout)

    def test_concept_without_gotcha_fails(self) -> None:
        def edit(d: Path) -> None:
            p = d / "tasks/double/task.toml"
            p.write_text(p.read_text().replace("gotcha = true", "gotcha = false"))
        done, _ = check(broken_copy(edit))
        self.assertIn("concept numbers has no gotcha task", done.stdout)

    def test_concept_without_a_name_fails(self) -> None:
        done, _ = check(broken_copy(lambda d: (d.parents[2] / "concepts.toml").write_text("")))
        self.assertEqual(done.returncode, 1)
        self.assertIn("concepts.toml: concept numbers has no name", done.stdout)

    def test_unused_concept_name_fails(self) -> None:
        def edit(d: Path) -> None:
            p = d.parents[2] / "concepts.toml"
            p.write_text(p.read_text() + 'gone = "gone"\n')
        done, _ = check(broken_copy(edit))
        self.assertEqual(done.returncode, 1)
        self.assertIn("concepts.toml: concept gone is named but no lesson or task uses it", done.stdout)

    def test_infinite_example_fails_instead_of_hanging(self) -> None:
        def edit(d: Path) -> None:
            text = (d / "lesson.md").read_text().replace("print(2 * 21)", "while True:\n    pass")
            (d / "lesson.md").write_text(text)
        done, _ = check(broken_copy(edit))
        self.assertIn("ran longer than 30 s", done.stdout)

    def test_broken_variant_fails(self) -> None:
        content = broken_copy(lambda d: (d / "tasks/double/variants/quadruple/solution.py").write_text(
            "def quadruple(n):\n    return n * 2\n"))
        done, _ = check(content)
        self.assertIn("basics-double-quadruple: the solution fails", done.stdout)

    def test_boss_solution_must_pass_every_stage(self) -> None:
        def edit(d: Path) -> None:
            p = d.parent / "boss" / "solution.py"
            p.write_text(p.read_text().replace("return a - b", "return a + b"))
        done, _ = check(broken_copy(edit))
        self.assertIn("calc: the solution (stage calc-sub) fails", done.stdout)

    def test_boss_needs_three_stages(self) -> None:
        done, _ = check(broken_copy(lambda d: shutil.rmtree(d.parent / "boss" / "stages" / "3-mul")))
        self.assertIn("a boss needs 3 to 5 stages, found 2", done.stdout)

    def test_boss_in_a_region_without_lessons_fails(self) -> None:
        def edit(d: Path) -> None:
            p = d.parent / "boss" / "boss.md"
            p.write_text(p.read_text().replace('region = "a"', 'region = "z"'))
        done, _ = check(broken_copy(edit))
        self.assertIn("region w1/z has no lessons", done.stdout)


    def test_false_claim_fails(self) -> None:
        def edit(d: Path) -> None:
            text = (d / "lesson.md").read_text().replace("assert 2 * 21 == 42", "assert 2 * 21 == 43")
            (d / "lesson.md").write_text(text)
        done, _ = check(broken_copy(edit))
        self.assertIn("basics: a claim is false", done.stdout)

    def test_claim_without_assert_fails(self) -> None:
        def edit(d: Path) -> None:
            text = (d / "lesson.md").read_text().replace("assert 2 * 21 == 42", "print(2 * 21)")
            (d / "lesson.md").write_text(text)
        done, _ = check(broken_copy(edit))
        self.assertIn("basics: a claim block needs an assert", done.stdout)

    def test_wrong_solution_the_tests_miss_fails(self) -> None:
        def edit(d: Path) -> None:
            (d / "tasks/double/wrong/abs.py").write_text("def double(n):\n    return abs(n) * 2\n")
        done, _ = check(broken_copy(edit))
        self.assertIn("basics-double: wrong/abs.py passes every test", done.stdout)

    def test_wrong_boss_solution_the_tests_miss_fails(self) -> None:
        def edit(d: Path) -> None:
            boss = d.parent / "boss"
            (boss / "wrong").mkdir(exist_ok=True)
            (boss / "wrong" / "same.py").write_text((boss / "solution.py").read_text())
        done, _ = check(broken_copy(edit))
        self.assertIn("calc: wrong/same.py passes every test", done.stdout)

    def test_solution_breaking_a_lint_rule_fails(self) -> None:
        def edit(d: Path) -> None:
            p = d / "tasks/double/solution.py"
            p.write_text("import os\n" + p.read_text())
        done, _ = check(broken_copy(edit))
        self.assertIn("w1/a/basics/tasks/double/solution.py: the solution breaks a lint rule", done.stdout)
        self.assertIn("F401", done.stdout)

    def test_broken_hint_code_fails(self) -> None:
        def edit(lesson: Path) -> None:
            toml = lesson / "tasks" / "double" / "task.toml"
            toml.write_text(toml.read_text().replace('hints = ["Multiply by 2."]', 'hints = ["Try `print(n * 2`."]'))
        done, _ = check(broken_copy(edit))
        self.assertNotEqual(done.returncode, 0)
        self.assertIn("hint code is not valid Python: `print(n * 2`", done.stdout + done.stderr)

    def test_broken_multiline_hint_code_fails(self) -> None:
        def edit(lesson: Path) -> None:
            toml = lesson / "tasks" / "double" / "task.toml"
            hint = r'hints = ["Try `for i in range(3\nprint(i)`."]'
            toml.write_text(toml.read_text().replace('hints = ["Multiply by 2."]', hint))
        done, _ = check(broken_copy(edit))
        self.assertNotEqual(done.returncode, 0)
        self.assertIn("hint code is not valid Python: `for i in range(3\nprint(i)`", done.stdout + done.stderr)

    def test_hint_quoting_the_solution_fails(self) -> None:
        def edit(lesson: Path) -> None:
            toml = lesson / "tasks" / "double" / "task.toml"
            toml.write_text(toml.read_text().replace('hints = ["Multiply by 2."]', 'hints = ["Try `return n * 2`."]'))
        done, _ = check(broken_copy(edit))
        self.assertEqual(done.returncode, 1)
        self.assertIn("basics-double: hint 1 gives away the solution: `return n * 2`", done.stdout)

    def test_hint_with_new_names_fails(self) -> None:
        def edit(lesson: Path) -> None:
            toml = lesson / "tasks" / "double" / "task.toml"
            toml.write_text(toml.read_text().replace('hints = ["Multiply by 2."]', 'hints = ["Try `return x * 2`."]'))
        done, _ = check(broken_copy(edit))
        self.assertEqual(done.returncode, 1)
        renamed = "basics-double: hint 1 gives away the solution: `return x * 2` is `return n * 2` renamed"
        self.assertIn(renamed, done.stdout)

    def test_hint_with_new_names_and_another_operation_passes(self) -> None:
        def edit(lesson: Path) -> None:
            toml = lesson / "tasks" / "double" / "task.toml"
            toml.write_text(toml.read_text().replace('hints = ["Multiply by 2."]', 'hints = ["Try `return x + 2`."]'))
        done, _ = check(broken_copy(edit))
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)

    def test_hint_with_swapped_attributes_strings_and_numbers_fails(self) -> None:
        problems = messages(['Try `return frame.sort_values("age").iloc[-1]["name"]`.'],
                            'return df.sort_values("height").iloc[-1]["name"]', "")
        self.assertEqual(len(problems), 1)
        self.assertIn("hint 1 gives away the solution", problems[0])
        self.assertIn("with names, strings or numbers changed", problems[0])

    def test_generic_hint_mentioning_a_builtin_or_attribute_passes(self) -> None:
        problems = messages(["`len()` counts the items in a list.", "Store the value in `self.x`."],
                            "return len(self.items)", "")
        self.assertEqual(problems, [])

    def test_a_different_message_passes(self) -> None:
        problems = messages(['Try `print(f"Hi, {city}!")`.'], 'return print(f"Hello, {name}!")', "")
        self.assertEqual(problems, [])

    def test_a_different_comprehension_passes(self) -> None:
        problems = messages(["Try `[w.upper() for w in words if len(w) > 3]`."],
                            "return [n * n for n in numbers if n % 2 == 1]", "")
        self.assertEqual(problems, [])

    def test_starter_line_and_short_line_in_a_hint_pass(self) -> None:
        def edit(lesson: Path) -> None:
            toml = lesson / "tasks" / "double" / "task.toml"
            hint = 'hints = ["Keep `def double(n):`, and `pass` is fine."]'
            toml.write_text(toml.read_text().replace('hints = ["Multiply by 2."]', hint))
        done, _ = check(broken_copy(edit))
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)

    def test_non_string_hint_fails_cleanly(self) -> None:
        def edit(lesson: Path) -> None:
            toml = lesson / "tasks" / "double" / "task.toml"
            toml.write_text(toml.read_text().replace('hints = ["Multiply by 2."]', "hints = [42]"))
        done, _ = check(broken_copy(edit))
        self.assertNotEqual(done.returncode, 0)
        self.assertIn("basics-double: a hint must be a string", done.stdout + done.stderr)

    def test_hint_fragments_and_prose_pass(self) -> None:
        # every fragment style found in real hints on 2026-10-15
        for span in ["elif n < 0:", "if n > 0", "return total", "else:", "except ValueError:", "break", "{'a': 1}",
                     "f'{name}!'", "n % 2 == 0", "xs.append(x)", "for x in xs:", "try: return a / b",
                     "except ZeroDivisionError: return None", "is None", "{total:.2f}", "elif age < 65: return 9",
                     "@dataclass(order=True)", ".copy()", "==", "*", ".tolist()", "key=",
                     '"std": round(float(np.std(values, ddof=0)), 2),', "for i in range(3):\n    print(i)"]:
            self.assertTrue(hint_code_compiles(span), span)
        for broken in ["print(n * 2", "if n > (0", "return (x", "xs.append(x", "for x in", "def f(:", "x = = 1",
                       "{total:.2f", "for i in range(3\n    print(i)",
                       "x = 1 +", "total = total +", "y = x *", "print(x) +", "not x ==", "x, y ="]:
            self.assertFalse(hint_code_compiles(broken), broken)
        for prose in ["if", "tests.py", "None"]:
            self.assertFalse(looks_like_code(prose) and not hint_code_compiles(prose), prose)


class GapList(unittest.TestCase):
    def test_a_listed_gap_passes_and_is_counted(self) -> None:
        content = broken_copy(lambda d: (d / "tasks/double/solution.py").write_text("def double(n):\n    return n\n"))
        gaps = Path(tempfile.mkdtemp()) / "gaps.toml"
        gaps.write_text(dump_gaps(f.key for f in vet(content)))
        done, _ = check(content, "--gaps", str(gaps))
        self.assertEqual(done.returncode, 0, done.stdout + done.stderr)
        self.assertIn("known gap: solution-fails x1", done.stdout)

    def test_a_stale_gap_fails(self) -> None:
        gaps = Path(tempfile.mkdtemp()) / "gaps.toml"
        gaps.write_text(dump_gaps([GapKey("solution-fails", "basics-double", "000000000000")]))
        done, _ = check(GOOD, "--gaps", str(gaps))
        self.assertEqual(done.returncode, 1)
        self.assertIn("gap list: solution-fails basics-double 000000000000 no longer happens", done.stdout)

    def test_a_quick_build_keeps_the_gaps_of_the_checks_it_skips(self) -> None:
        gaps = Path(tempfile.mkdtemp()) / "gaps.toml"
        gaps.write_text(dump_gaps([GapKey("weak-tests", "basics-double", "000000000000")]))
        quick, _ = check(GOOD, "--gaps", str(gaps), "--quick")
        self.assertEqual(quick.returncode, 0, quick.stdout + quick.stderr)
        self.assertIn("quick: right-fails, right-refused, version-differs, weak-tests not checked", quick.stdout)
        full, _ = check(GOOD, "--gaps", str(gaps))
        self.assertIn("gap list: weak-tests basics-double 000000000000 no longer happens", full.stdout)


class Libraries(unittest.TestCase):
    def test_library_versions_must_match_pyodide(self) -> None:
        versions = {"numpy": "2.4.6", "pandas": "3.0.0", "scikit-learn": "1.8.0"}
        with mock.patch("importlib.metadata.version", side_effect=lambda name: versions[name]):
            problems = library_problems()
        expected = "libraries: pandas is 3.0.0 here, Pyodide ships 3.0.2: run the check with pnpm content"
        self.assertEqual(problems, [expected])

    def test_if_changed_skips_until_the_content_changes(self) -> None:
        content = broken_copy(lambda lesson: None)
        out = Path(tempfile.mkdtemp()) / "bundle.json"
        run = [sys.executable, "tools/content_check.py", "--content", str(content), "--out", str(out),
               "--no-version-check", "--if-changed"]
        first = subprocess.run(run, cwd=ROOT, capture_output=True, text=True, timeout=180, check=False)
        self.assertIn("content ok", first.stdout, first.stdout + first.stderr)
        again = subprocess.run(run, cwd=ROOT, capture_output=True, text=True, timeout=180, check=False)
        self.assertIn("content unchanged", again.stdout)
        lesson = content / "w1" / "a" / "basics" / "lesson.md"
        lesson.write_text(lesson.read_text() + "\nOne more line.\n")
        sync_ledger(content)
        edited = subprocess.run(run, cwd=ROOT, capture_output=True, text=True, timeout=180, check=False)
        self.assertIn("content ok", edited.stdout, edited.stdout + edited.stderr)

    def test_if_changed_lets_a_full_build_serve_a_quick_one_and_not_the_reverse(self) -> None:
        out = Path(tempfile.mkdtemp()) / "bundle.json"
        run = [sys.executable, "tools/content_check.py", "--content", str(GOOD), "--out", str(out),
               "--no-version-check", "--if-changed"]

        def said(*extra: str) -> str:
            done = subprocess.run([*run, *extra], cwd=ROOT, capture_output=True, text=True, timeout=180, check=False)
            return done.stdout.splitlines()[-1]

        self.assertTrue(said("--quick").startswith("content ok"))
        self.assertTrue(said().startswith("content ok"))
        self.assertTrue(said("--quick").startswith("content unchanged"))


if __name__ == "__main__":
    unittest.main()
