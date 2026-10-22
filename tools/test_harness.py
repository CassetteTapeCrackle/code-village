import json
import subprocess
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "py"))
import harness  # noqa: E402

TESTS = '''
def test_adds_two():
    """add_twice([1], 5) gives [1, 5, 5]"""
    expect_equal(learner["add_twice"]([1], 5), [1, 5, 5], "add_twice([1], 5)")

def test_empty():
    expect_equal(learner["add_twice"]([], 0), [0, 0], "add_twice([], 0)")
'''


class RunCode(unittest.TestCase):
    def test_prints_and_feeds_input(self):
        out = harness.run_code("name = input('Name? ')\nprint('hi', name)", ["Noa"])
        self.assertEqual(out, {"stdout": "Name? Noa\nhi Noa\n", "error": None})

    def test_error_is_trimmed_to_learner_code(self):
        out = harness.run_code("x = 1\nprint(x / 0)", [])
        self.assertIn('line 2', out["error"])
        self.assertIn("ZeroDivisionError: division by zero", out["error"])
        self.assertNotIn("harness.py", out["error"])

    def test_syntax_error_names_the_line(self):
        out = harness.run_code("print('a'\nprint('b')", [])
        self.assertIn("SyntaxError", out["error"])
        self.assertIn("line 1", out["error"])

    def test_input_runs_out(self):
        out = harness.run_code("input()\ninput()", ["only one"])
        self.assertEqual(out["stdout"], "only one\n\n")
        self.assertIn("input() is waiting for an answer", out["error"])

    def test_output_is_capped(self):
        out = harness.run_code("for i in range(100000):\n    print('spam spam spam')", [])
        self.assertTrue(out["stdout"].endswith("(output cut)\n"))
        self.assertLessEqual(len(out["stdout"]), harness.MAX_OUTPUT + 20)


class RunTests(unittest.TestCase):
    def test_all_pass(self):
        code = "def add_twice(items, x):\n    items.append(x)\n    items.append(x)\n    return items"
        out = harness.run_tests(code, TESTS)
        self.assertIsNone(out["error"])
        self.assertEqual([r["passed"] for r in out["results"]], [True, True])
        self.assertEqual(out["results"][0]["name"], "add_twice([1], 5) gives [1, 5, 5]")
        self.assertEqual(out["results"][1]["name"], "empty")

    def test_wrong_value_message(self):
        code = "def add_twice(items, x):\n    items.append(x)\n    return items"
        r = harness.run_tests(code, TESTS)["results"][0]
        self.assertFalse(r["passed"])
        prefix = "add_twice([1], 5) returned [1, 5], expected "
        self.assertEqual(r["message"], f"{prefix}[1, 5, 5]\n{' ' * (len(prefix) + 5)}^")

    def test_missing_function(self):
        r = harness.run_tests("def add_once(items, x):\n    return items", TESTS)["results"][0]
        self.assertEqual(r["message"], "add_twice is not defined in your code")

    def test_learner_exception_inside_test(self):
        r = harness.run_tests("def add_twice(items, x):\n    return items[5]", TESTS)["results"][0]
        self.assertEqual(r["message"], "your code raised IndexError: list index out of range")

    def test_syntax_error_stops_before_tests(self):
        out = harness.run_tests("def add_twice(items, x)\n    return items", TESTS)
        self.assertIn("SyntaxError", out["error"])
        self.assertEqual(out["results"], [])

    def test_input_during_check_fails_readably(self):
        out = harness.run_tests("name = input()\ndef add_twice(items, x):\n    return items", TESTS)
        self.assertIn("input() was called, but this task gives no input", out["error"])

    def test_run_program_for_script_tasks(self):
        tests = 'PROGRAM = True\ndef test_greets():\n    expect_equal(run_program(["Ines"]), "Hello Ines\\n")'
        out = harness.run_tests("print('Hello', input())", tests)
        self.assertTrue(out["results"][0]["passed"], out)

    def test_input_prompt_does_not_change_checked_output(self):
        # regression: a classmate's input("Name: ") worked in VS Code but failed the check
        tests = 'PROGRAM = True\ndef test_greets():\n    expect_equal(run_program(["Ines"]), "Hello Ines\\n")'
        out = harness.run_tests("print('Hello', input('Name: '))", tests)
        self.assertTrue(out["results"][0]["passed"], out)


class LenientChecks(unittest.TestCase):
    def passes(self, got, expected, strict=False):
        tests = f'def test_value():\n    expect_equal(learner["value"](), {expected!r})'
        return harness.run_tests(f'def value():\n    return {got!r}', tests, strict=strict)["results"][0]

    def test_case_is_forgiven(self):
        self.assertTrue(self.passes("hello sam", "Hello Sam")["passed"])

    def test_extra_spaces_are_forgiven(self):
        self.assertTrue(self.passes("  hello   sam  ", "hello sam")["passed"])

    def test_punctuation_is_forgiven(self):
        r = self.passes("Hello Sam", "Hello, Sam!")
        self.assertTrue(r["passed"], r)

    def test_a_dot_between_digits_is_kept(self):
        self.assertFalse(self.passes("15", "1.5")["passed"])

    def test_a_comma_between_digits_is_kept(self):
        self.assertFalse(self.passes("1000", "1,000")["passed"])

    def test_strict_keeps_the_text_exact(self):
        self.assertFalse(self.passes("hello sam", "Hello, Sam!", strict=True)["passed"])
        self.assertTrue(self.passes("Hello, Sam!", "Hello, Sam!", strict=True)["passed"])

    def test_lists_of_str_are_compared_item_by_item(self):
        tests = 'def test_value():\n    expect_equal(learner["value"](), ["Hello, Sam!", "Bye"])'
        out = harness.run_tests('def value():\n    return ["hello sam", "BYE."]', tests)
        self.assertTrue(out["results"][0]["passed"], out)

    def test_message_marks_the_first_difference(self):
        r = self.passes("Hello Sam!", "Hello, Sam!", strict=True)
        self.assertEqual(r["message"], "expected 'Hello, Sam!', got 'Hello Sam!'\n" + " " * 15 + "^")

    def test_non_str_values_still_compare_exactly(self):
        self.assertFalse(self.passes(1, "1")["passed"])


class Cli(unittest.TestCase):
    def test_cli_round_trip(self):
        payload = json.dumps({"mode": "run", "code": "print(6 * 7)", "inputs": []})
        done = subprocess.run([sys.executable, "py/harness.py"], input=payload, capture_output=True, text=True,
                              cwd=Path(__file__).resolve().parent.parent, timeout=20)
        self.assertEqual(json.loads(done.stdout), {"stdout": "42\n", "error": None})


if __name__ == "__main__":
    unittest.main()


class Libraries(unittest.TestCase):
    def test_finds_big_library_imports_only(self):
        source = "import os\nimport numpy as np\nfrom sklearn.neighbors import KNeighborsClassifier\nfrom . import x\n"
        self.assertEqual(harness.heavy_imports(source), ["numpy", "sklearn.neighbors", "sklearn.neighbors.KNeighborsClassifier"])

    def test_no_heavy_imports_in_broken_or_plain_code(self):
        self.assertEqual(harness.heavy_imports("def f(:\n"), [])
        self.assertEqual(harness.heavy_imports("import json\nprint(1)"), [])

    def test_preimport_ignores_names_that_are_not_modules(self):
        harness.preimport(["json", "json.dumps", "no_such_module_here"])  # nothing raised


class Files(unittest.TestCase):
    def test_each_job_starts_in_an_empty_folder(self):
        home = Path.cwd()
        first = harness.run_code("open('notes.txt', 'w').write('hi')\nimport os\nprint(os.listdir('.'))", [])
        self.assertEqual(first["stdout"], "['notes.txt']\n")
        second = harness.run_code("import os\nprint(os.listdir('.'))", [])
        self.assertEqual(second["stdout"], "[]\n")
        self.assertEqual(Path.cwd(), home)
        self.assertFalse((home / "notes.txt").exists())
