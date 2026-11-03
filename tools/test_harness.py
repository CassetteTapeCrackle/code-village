import json
import subprocess
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "py"))
import harness

TESTS = '''
def test_adds_two():
    """add_twice([1], 5) gives [1, 5, 5]"""
    expect_equal(learner["add_twice"]([1], 5), [1, 5, 5], "add_twice([1], 5)")

def test_empty():
    expect_equal(learner["add_twice"]([], 0), [0, 0], "add_twice([], 0)")
'''


class RunCode(unittest.TestCase):
    def test_prints_and_feeds_input(self) -> None:
        out = harness.run_code("name = input('Name? ')\nprint('hi', name)", ["Noa"])
        self.assertEqual(out, {"stdout": "Name? Noa\nhi Noa\n", "error": None})

    def test_error_is_trimmed_to_learner_code(self) -> None:
        out = harness.run_code("x = 1\nprint(x / 0)", [])
        self.assertIn('line 2', out["error"])
        self.assertIn("ZeroDivisionError: division by zero", out["error"])
        self.assertNotIn("harness.py", out["error"])

    def test_syntax_error_names_the_line(self) -> None:
        out = harness.run_code("print('a'\nprint('b')", [])
        self.assertIn("SyntaxError", out["error"])
        self.assertIn("line 1", out["error"])

    def test_input_runs_out(self) -> None:
        out = harness.run_code("input()\ninput()", ["only one"])
        self.assertEqual(out["stdout"], "only one\n\n")
        self.assertIn("input() is waiting for an answer", out["error"])

    def test_output_is_capped(self) -> None:
        out = harness.run_code("for i in range(100000):\n    print('spam spam spam')", [])
        self.assertTrue(out["stdout"].endswith("(output cut)\n"))
        self.assertLessEqual(len(out["stdout"]), harness.MAX_OUTPUT + 20)


class RunTests(unittest.TestCase):
    def test_all_pass(self) -> None:
        code = "def add_twice(items, x):\n    items.append(x)\n    items.append(x)\n    return items"
        out = harness.run_tests(code, TESTS)
        self.assertIsNone(out["error"])
        self.assertEqual([r["passed"] for r in out["results"]], [True, True])
        self.assertEqual(out["results"][0]["name"], "add_twice([1], 5) gives [1, 5, 5]")
        self.assertEqual(out["results"][1]["name"], "empty")

    def test_wrong_value_message(self) -> None:
        code = "def add_twice(items, x):\n    items.append(x)\n    return items"
        r = harness.run_tests(code, TESTS)["results"][0]
        self.assertFalse(r["passed"])
        prefix = "add_twice([1], 5) returned [1, 5], expected "
        self.assertEqual(r["message"], f"{prefix}[1, 5, 5]\n{' ' * (len(prefix) + 5)}^")

    def test_missing_function(self) -> None:
        r = harness.run_tests("def add_once(items, x):\n    return items", TESTS)["results"][0]
        self.assertEqual(r["message"], "add_twice is not defined in your code")

    def test_learner_exception_inside_test(self) -> None:
        r = harness.run_tests("def add_twice(items, x):\n    return items[5]", TESTS)["results"][0]
        self.assertEqual(r["message"], "your code raised IndexError: list index out of range")

    def test_syntax_error_stops_before_tests(self) -> None:
        out = harness.run_tests("def add_twice(items, x)\n    return items", TESTS)
        self.assertIn("SyntaxError", out["error"])
        self.assertEqual(out["results"], [])

    def test_input_during_check_fails_readably(self) -> None:
        out = harness.run_tests("name = input()\ndef add_twice(items, x):\n    return items", TESTS)
        self.assertIn("input() was called, but this task gives no input", out["error"])

    def test_run_program_for_script_tasks(self) -> None:
        tests = 'PROGRAM = True\ndef test_greets():\n    expect_equal(run_program(["Ines"]), "Hello Ines\\n")'
        out = harness.run_tests("print('Hello', input())", tests)
        self.assertTrue(out["results"][0]["passed"], out)

    def test_input_prompt_does_not_change_checked_output(self) -> None:
        # regression: a classmate's input("Name: ") worked in VS Code but failed the check
        tests = 'PROGRAM = True\ndef test_greets():\n    expect_equal(run_program(["Ines"]), "Hello Ines\\n")'
        out = harness.run_tests("print('Hello', input('Name: '))", tests)
        self.assertTrue(out["results"][0]["passed"], out)


class LenientChecks(unittest.TestCase):
    def passes(self, got: object, expected: object, strict: bool = False) -> harness.TestResult:
        tests = f'def test_value():\n    expect_equal(learner["value"](), {expected!r})'
        return harness.run_tests(f'def value():\n    return {got!r}', tests, strict=strict)["results"][0]

    def test_case_is_forgiven(self) -> None:
        self.assertTrue(self.passes("hello sam", "Hello Sam")["passed"])

    def test_extra_spaces_are_forgiven(self) -> None:
        self.assertTrue(self.passes("  hello   sam  ", "hello sam")["passed"])

    def test_punctuation_is_forgiven(self) -> None:
        r = self.passes("Hello Sam", "Hello, Sam!")
        self.assertTrue(r["passed"], r)

    def test_a_dot_between_digits_is_kept(self) -> None:
        self.assertFalse(self.passes("15", "1.5")["passed"])

    def test_a_comma_between_digits_is_kept(self) -> None:
        self.assertFalse(self.passes("1000", "1,000")["passed"])

    def test_strict_keeps_the_text_exact(self) -> None:
        self.assertFalse(self.passes("hello sam", "Hello, Sam!", strict=True)["passed"])
        self.assertTrue(self.passes("Hello, Sam!", "Hello, Sam!", strict=True)["passed"])

    def test_lists_of_str_are_compared_item_by_item(self) -> None:
        tests = 'def test_value():\n    expect_equal(learner["value"](), ["Hello, Sam!", "Bye"])'
        out = harness.run_tests('def value():\n    return ["hello sam", "BYE."]', tests)
        self.assertTrue(out["results"][0]["passed"], out)

    def test_message_marks_the_first_difference(self) -> None:
        r = self.passes("Hello Sam!", "Hello, Sam!", strict=True)
        self.assertEqual(r["message"], "expected 'Hello, Sam!', got 'Hello Sam!'\n" + " " * 15 + "^")

    def test_non_str_values_still_compare_exactly(self) -> None:
        self.assertFalse(self.passes(1, "1")["passed"])


class Cli(unittest.TestCase):
    def test_cli_round_trip(self) -> None:
        payload = json.dumps({"mode": "run", "code": "print(6 * 7)", "inputs": []})
        done = subprocess.run([sys.executable, "py/harness.py"], input=payload, capture_output=True, text=True,
                              cwd=Path(__file__).resolve().parent.parent, timeout=20, check=False)
        self.assertEqual(json.loads(done.stdout), {"stdout": "42\n", "error": None})



class Libraries(unittest.TestCase):
    def test_finds_big_library_imports_only(self) -> None:
        source = "import os\nimport numpy as np\nfrom sklearn.neighbors import KNeighborsClassifier\nfrom . import x\n"
        expected = ["numpy", "sklearn.neighbors", "sklearn.neighbors.KNeighborsClassifier"]
        self.assertEqual(harness.heavy_imports(source), expected)

    def test_no_heavy_imports_in_broken_or_plain_code(self) -> None:
        self.assertEqual(harness.heavy_imports("def f(:\n"), [])
        self.assertEqual(harness.heavy_imports("import json\nprint(1)"), [])

    def test_preimport_ignores_names_that_are_not_modules(self) -> None:
        harness.preimport(["json", "json.dumps", "no_such_module_here"])  # nothing raised


class Files(unittest.TestCase):
    def test_each_job_starts_in_an_empty_folder(self) -> None:
        home = Path.cwd()
        first = harness.run_code("open('notes.txt', 'w').write('hi')\nimport os\nprint(os.listdir('.'))", [])
        self.assertEqual(first["stdout"], "['notes.txt']\n")
        second = harness.run_code("import os\nprint(os.listdir('.'))", [])
        self.assertEqual(second["stdout"], "[]\n")
        self.assertEqual(Path.cwd(), home)
        self.assertFalse((home / "notes.txt").exists())


LARGER = "def larger(a, b):\n    return a if a > b else b\n"
LARGER_TESTS = 'def test_larger():\n    expect_equal(learner["larger"](1, 2), 2, "larger(1, 2)")\n'


def expr_case(expr: str, expect: str, compare: str = "exact", raises: str | None = None,
              setup: str = "") -> harness.Case:
    return {"kind": "expr", "show": expr, "setup": setup, "expr": expr, "expect": expect, "raises": raises,
            "compare": compare}


def hidden(out: harness.CheckResult) -> list[harness.TestResult]:
    return [r for r in out["results"] if r["hidden"]]


class HiddenCases(unittest.TestCase):
    def test_hidden_case_message_shape(self) -> None:
        code = "def larger(a, b):\n    return b if b < 5 else a\n"  # passes the visible test, fails (3, 7)
        out = harness.run_tests(code, LARGER_TESTS, cases=[expr_case("larger(3, 7)", "7")])
        self.assertEqual([r["passed"] for r in out["results"]], [True, False])
        [result] = hidden(out)
        self.assertEqual(result["message"], "We also tried larger(3, 7): expected 7, your code returned 3.")

    def test_all_cases_pass_gives_one_summary(self) -> None:
        cases = [expr_case(f"larger({a}, {b})", str(max(a, b))) for a in range(5) for b in range(5)]
        out = harness.run_tests(LARGER, LARGER_TESTS, cases=cases)
        self.assertEqual(hidden(out), [{"name": "25 more inputs", "passed": True, "message": "", "hidden": True}])
        self.assertFalse(out["results"][0]["hidden"])

    def test_stops_at_the_first_failing_case(self) -> None:
        cases = [expr_case("larger(1, 2)", "2"), expr_case("larger(5, 4)", "5"), expr_case("larger(9, 8)", "9")]
        out = harness.run_tests("def larger(a, b):\n    return b\n", LARGER_TESTS, cases=cases)
        [result] = hidden(out)
        self.assertIn("larger(5, 4)", result["message"])

    def test_hidden_cases_run_after_a_failed_visible_test(self) -> None:
        code = "def larger(a, b):\n    return a\n"
        out = harness.run_tests(code, LARGER_TESTS, cases=[expr_case("larger(2, 1)", "2")])
        self.assertEqual([r["passed"] for r in out["results"]], [False, True])

    def test_hidden_raise_message(self) -> None:
        out = harness.run_tests("def larger(a, b):\n    return a / 0\n", "", cases=[expr_case("larger(3, 7)", "7")])
        [result] = hidden(out)
        self.assertEqual(result["message"],
                         "We also tried larger(3, 7): expected 7, your code raised ZeroDivisionError: "
                         "division by zero.")

    def test_expected_raise_passes_on_the_same_type(self) -> None:
        code = "def root(n):\n    if n < 0:\n        raise ValueError('negative')\n    return n ** 0.5\n"
        case = expr_case("root(-1)", "None", raises="ValueError")
        self.assertTrue(hidden(harness.run_tests(code, "", cases=[case]))[0]["passed"])
        out = harness.run_tests("def root(n):\n    return 0\n", "", cases=[case])
        self.assertEqual(hidden(out)[0]["message"],
                         "We also tried root(-1): expected ValueError, your code returned 0.")

    def test_long_values_are_cut(self) -> None:
        out = harness.run_tests("def f():\n    return 'x' * 200\n", "", cases=[expr_case("f()", "''")])
        message = hidden(out)[0]["message"]
        self.assertIn("returned '" + "x" * 76 + "....", message)

    def test_hidden_case_ignores_learner_prints(self) -> None:
        code = "print('loading')\ndef larger(a, b):\n    print('comparing', a, b)\n    return max(a, b)\n"
        out = harness.run_tests(code, LARGER_TESTS, cases=[expr_case("larger(3, 7)", "7")])
        self.assertTrue(hidden(out)[0]["passed"])

    def test_each_hidden_case_gets_fresh_arguments(self) -> None:
        code = "seen = []\ndef add(items, x):\n    seen.append(x)\n    items.append(x)\n" \
               "    return len(items) + len(seen)\n"
        cases = [expr_case("add([1], 5)", "3"), expr_case("add([1], 5)", "3")]
        self.assertTrue(hidden(harness.run_tests(code, "", cases=cases))[0]["passed"])

    def test_missing_function_reported_once(self) -> None:
        cases = [expr_case(f"larger({n}, 0)", str(n)) for n in range(100)]
        out = harness.run_tests("def largr(a, b):\n    return a\n", LARGER_TESTS, cases=cases)
        [result] = hidden(out)
        self.assertEqual(result["message"],
                         "We also tried larger(0, 0): expected 0, your code raised NameError: name 'larger' is not "
                         "defined.")

    def test_exact_compare_is_type_aware(self) -> None:
        out = harness.run_tests("def f():\n    return True\n", "", cases=[expr_case("f()", "1")])
        self.assertFalse(hidden(out)[0]["passed"])
        out = harness.run_tests("def f():\n    return [2.0]\n", "", cases=[expr_case("f()", "[2]")])
        self.assertFalse(hidden(out)[0]["passed"])

    def test_float_compare_tolerates_rounding(self) -> None:
        out = harness.run_tests("def f():\n    return 0.1 + 0.2\n", "", cases=[expr_case("f()", "0.3", "float")])
        self.assertTrue(hidden(out)[0]["passed"])
        out = harness.run_tests("def f():\n    return [0.1 + 0.2, 1]\n", "",
                                cases=[expr_case("f()", "[0.31, 1]", "float")])
        self.assertIn("returned [0.30000000000000004, 1]", hidden(out)[0]["message"])

    def test_unordered_compare(self) -> None:
        out = harness.run_tests("def f():\n    return [3, 1, [2]]\n", "",
                                cases=[expr_case("f()", "[1, [2], 3]", "unordered")])
        self.assertTrue(hidden(out)[0]["passed"])
        case = expr_case("f()", "[1, 3, 3]", "unordered")
        out = harness.run_tests("def f():\n    return [1, 1, 3]\n", "", cases=[case])
        self.assertFalse(hidden(out)[0]["passed"])

    def test_text_compare_forgives_unless_strict(self) -> None:
        case = expr_case("f()", "'Hello, Sam!'", "text")
        code = "def f():\n    return 'hello sam'\n"
        self.assertTrue(hidden(harness.run_tests(code, "", cases=[case]))[0]["passed"])
        out = harness.run_tests(code, "", strict=True, cases=[case])
        self.assertFalse(hidden(out)[0]["passed"])

    def test_valid_function_compare(self) -> None:
        tests = "def is_factor(inputs, answer):\n    (n,) = inputs\n    return 1 < answer < n and n % answer == 0\n"
        case: harness.Case = {**expr_case("factor(12)", "(12,)", "valid"), "valid": "is_factor"}
        self.assertTrue(hidden(harness.run_tests("def factor(n):\n    return 3\n", tests, cases=[case]))[0]["passed"])
        out = harness.run_tests("def factor(n):\n    return 5\n", tests, cases=[case])
        self.assertEqual(hidden(out)[0]["message"],
                         "We also tried factor(12): expected an answer is_factor accepts, your code returned 5.")

    def test_array_and_frame_compare(self) -> None:
        setup = "import numpy as np\nimport pandas as pd"
        array = expr_case("f()", "__import__('numpy').array([0.5, 1.0])", "array", setup=setup)
        code = "import numpy as np\ndef f():\n    return np.array([1, 2]) / 2\n"
        self.assertTrue(hidden(harness.run_tests(code, "", cases=[array]))[0]["passed"])
        frame = expr_case("f()", "__import__('pandas').DataFrame({'a': [1, 2]})", "frame", setup=setup)
        code = "import pandas as pd\ndef f():\n    return pd.DataFrame({'a': [0, 1, 2]}).iloc[1:]\n"
        self.assertTrue(hidden(harness.run_tests(code, "", cases=[frame]))[0]["passed"])

    def test_setup_and_objects(self) -> None:
        code = "class Box:\n    def __init__(self):\n        self.items = []\n    def put(self, x):\n" \
               "        self.items.append(x)\n"
        case = expr_case("[obj.put(1), obj.put(2), obj.items]", "[None, None, [1, 2]]", setup="obj = Box()")
        self.assertTrue(hidden(harness.run_tests(code, "", cases=[case]))[0]["passed"])

    def test_program_case_compares_output(self) -> None:
        code = "age = int(input('Age? '))\nprint('Adult' if age >= 18 else 'Child')\n"
        tests = 'PROGRAM = True\ndef test_adult():\n    expect_equal(run_program(["30"]), "Adult\\n")\n'
        case: harness.Case = {"kind": "program", "show": "typing 18", "stdin": ["18"], "expect": "'Adult\\n'",
                              "compare": "text"}
        self.assertTrue(hidden(harness.run_tests(code, tests, cases=[case]))[0]["passed"])
        out = harness.run_tests(code.replace(">=", ">"), tests, cases=[case])
        self.assertEqual(hidden(out)[0]["message"], "We also tried typing 18: expected 'Adult\\n', your code "
                                                    "returned 'Child\\n'.")

    def test_program_case_with_too_few_lines(self) -> None:
        case: harness.Case = {"kind": "program", "show": "typing 1", "stdin": ["1"], "expect": "'2\\n'",
                              "compare": "text"}
        out = harness.run_tests("a = input()\nb = input()\nprint(a, b)\n", "PROGRAM = True\n", cases=[case])
        self.assertEqual(hidden(out)[0]["message"], "We also tried typing 1: expected '2\\n', your code stopped: "
                                                    "input() was called more times than this test gives answers.")


class HiddenCasesNeverCrash(unittest.TestCase):
    """Learner code and odd task data give a message; the harness itself never raises."""

    def test_expected_value_may_need_a_setup_import(self) -> None:
        case = expr_case("half(1)", "Fraction(1, 2)", setup="from fractions import Fraction")
        code = "from fractions import Fraction\ndef half(n):\n    return Fraction(n, 2)\n"
        self.assertTrue(hidden(harness.run_tests(code, "", cases=[case]))[0]["passed"])

    def test_unreadable_expected_value_is_reported(self) -> None:
        out = harness.run_tests("def f():\n    return 1\n", "", cases=[expr_case("f()", "Nope(1)")])
        self.assertEqual(hidden(out)[0]["message"], "We also tried f(), but its expected value could not be read "
                                                    "(NameError): please report this task.")

    def test_learner_repr_that_raises(self) -> None:
        code = "class Odd:\n    def __repr__(self):\n        raise ValueError('no')\ndef f():\n    return Odd()\n"
        out = harness.run_tests(code, "", cases=[expr_case("f()", "1")])
        self.assertEqual(hidden(out)[0]["message"], "We also tried f(): expected 1, your code returned a Odd that "
                                                    "cannot be shown.")

    def test_learner_eq_that_raises(self) -> None:
        code = "class Odd:\n    def __eq__(self, other):\n        raise ValueError('no')\ndef f():\n    return Odd()\n"
        out = harness.run_tests(code, "", cases=[expr_case("f()", "1", "text")])
        self.assertFalse(hidden(out)[0]["passed"])

    def test_validity_function_that_raises_refuses_the_answer(self) -> None:
        tests = "def is_long(inputs, answer):\n    return len(answer) > 2\n"
        case: harness.Case = {**expr_case("f(1)", "(1,)", "valid"), "valid": "is_long"}
        out = harness.run_tests("def f(n):\n    return None\n", tests, cases=[case])
        self.assertEqual(hidden(out)[0]["message"],
                         "We also tried f(1): expected an answer is_long accepts, your code returned None.")

    def test_input_in_a_function_task(self) -> None:
        out = harness.run_tests("def f():\n    return input()\n", "", cases=[expr_case("f()", "1")])
        self.assertEqual(hidden(out)[0]["message"], "We also tried f(): expected 1, your code stopped: input() was "
                                                    "called, but this task gives no input.")

    def test_raise_without_a_message(self) -> None:
        out = harness.run_tests("def f():\n    raise ValueError\n", "", cases=[expr_case("f()", "1")])
        self.assertEqual(hidden(out)[0]["message"], "We also tried f(): expected 1, your code raised ValueError.")

    def test_one_case_summary_is_singular(self) -> None:
        out = harness.run_tests("def f():\n    return 1\n", "", cases=[expr_case("f()", "1")])
        self.assertEqual(hidden(out)[0]["name"], "1 more input")

    def test_nan_equals_nan(self) -> None:
        out = harness.run_tests("def f():\n    return float('nan')\n", "", cases=[expr_case("f()", "float('nan')")])
        self.assertTrue(hidden(out)[0]["passed"])


class ExpectMode(unittest.TestCase):
    def test_expect_mode_returns_reprs(self) -> None:
        code = "def root(n):\n    if n < 0:\n        raise ValueError('negative')\n    return n ** 0.5\n"
        inputs: list[harness.CaseInput] = [{"show": "root(4)", "setup": "", "expr": "root(4)"},
                                           {"show": "root(-1)", "setup": "", "expr": "root(-1)"}]
        self.assertEqual(harness.expect_values(code, inputs),
                         {"values": [{"repr": "2.0", "raises": None}, {"repr": "None", "raises": "ValueError"}]})

    def test_expect_mode_writes_library_values_as_source(self) -> None:
        code = "import numpy as np\nimport pandas as pd\ndef f():\n    return np.array([1, 2])\n" \
               "def g():\n    return pd.DataFrame({'a': [1]})\ndef h():\n    return np.int64(3)\n" \
               "def k():\n    a = np.array([1, 2])\n    return a.min(), a.max()\n"
        inputs: list[harness.CaseInput] = [{"show": n, "setup": "", "expr": n} for n in ("f()", "g()", "h()", "k()")]
        reprs = [v["repr"] for v in harness.expect_values(code, inputs)["values"]]
        self.assertEqual(reprs, ["__import__('numpy').array([1, 2], dtype='int64')",
                                 "__import__('pandas').DataFrame({'a': [1]}, index=[0]).astype({'a': 'int64'})",
                                 "3", "(1, 2)"])

    def answers_pass_their_own_cases(self, code: str, compare: str) -> None:
        """Every answer the expect mode writes comes back equal when a Check reads it."""
        inputs: list[harness.CaseInput] = [{"show": "f()", "setup": "", "expr": "f()"}]
        [value] = harness.expect_values(code, inputs)["values"]
        assert value["repr"] is not None
        out = harness.run_tests(code, "", cases=[expr_case("f()", value["repr"], compare)])
        self.assertTrue(hidden(out)[0]["passed"], hidden(out)[0]["message"])

    def test_pandas_index_and_dtype_survive(self) -> None:
        self.answers_pass_their_own_cases("import pandas as pd\ndef f():\n    s = pd.Series([1, 2, 3])\n"
                                          "    return s[s > 1]\n", "exact")
        self.answers_pass_their_own_cases("import pandas as pd\ndef f():\n    d = pd.DataFrame({'a': [1, 2]})\n"
                                          "    return d[d['a'] > 5]\n", "frame")

    def test_infinity_and_sets_are_written_as_source(self) -> None:
        code = "def f():\n    return float('inf')\ndef g():\n    return {'tree', 'cat', 'sun', 'dog'}\n"
        inputs: list[harness.CaseInput] = [{"show": n, "setup": "", "expr": n} for n in ("f()", "g()")]
        reprs = [v["repr"] for v in harness.expect_values(code, inputs)["values"]]
        self.assertEqual(reprs, ["float('inf')", "{'cat', 'dog', 'sun', 'tree'}"])

    def test_answer_without_source_has_no_repr(self) -> None:
        code = "class Point:\n    pass\ndef f():\n    return Point()\n"
        [value] = harness.expect_values(code, [{"show": "f()", "setup": "", "expr": "f()"}])["values"]
        self.assertEqual(value, {"repr": None, "raises": None})

    def test_expect_mode_runs_programs(self) -> None:
        inputs: list[harness.CaseInput] = [{"show": "typing 2", "stdin": ["2"]}]
        out = harness.expect_values("print(int(input()) * 2)\n", inputs)
        self.assertEqual(out, {"values": [{"repr": "'4\\n'", "raises": None}]})

    def test_expect_job_through_the_cli(self) -> None:
        payload = json.dumps({"mode": "expect", "code": "def f(x):\n    return x + 1\n",
                              "cases": [{"show": "f(1)", "setup": "", "expr": "f(1)"}]})
        done = subprocess.run([sys.executable, "py/harness.py"], input=payload, capture_output=True, text=True,
                              cwd=Path(__file__).resolve().parent.parent, timeout=20, check=False)
        self.assertEqual(json.loads(done.stdout), {"values": [{"repr": "2", "raises": None}]})


VOCABULARY = {
    "for-loop": ["node:For"],
    "list-comprehension": ["node:ListComp"],
    "fn-len": ["call:len"],
    "append": ["method:append"],
    "math": ["import:math"],
    "property": ["decorator:property"],
    "sorted-key": ["kwarg:sorted.key"],
}


class DetectFeatures(unittest.TestCase):
    def detect(self, code: str, own_names: tuple[str, ...] = ()) -> set[str]:
        return harness.detect_features(code, VOCABULARY, own_names)

    def test_node_detector(self) -> None:
        self.assertEqual(self.detect("for x in []:\n    pass\n"), {"for-loop"})

    def test_call_detector_names_a_builtin(self) -> None:
        self.assertEqual(self.detect("len([])"), {"fn-len"})

    def test_method_detector(self) -> None:
        self.assertEqual(self.detect("xs = []\nxs.append(1)\n"), {"append"})

    def test_import_detector_for_both_import_forms(self) -> None:
        self.assertEqual(self.detect("import math\n"), {"math"})
        self.assertEqual(self.detect("from math import sqrt\n"), {"math"})

    def test_decorator_detector_strips_call_and_owner(self) -> None:
        code = "class A:\n    @property\n    def x(self): ...\n    @x.setter\n    def x(self, v): ...\n"
        self.assertEqual(self.detect(code), {"property", "unknown:decorator:setter", "unknown:node:FunctionDef",
                                             "unknown:node:ClassDef"})

    def test_kwarg_detector_names_the_call(self) -> None:
        self.assertEqual(self.detect("sorted([], key=len)\n"), {"sorted-key", "unknown:call:sorted"})
        self.assertEqual(self.detect("max([], key=len)\n"), {"unknown:call:max"})

    def test_unknown_feature_reported(self) -> None:
        found = self.detect("print(1)\nx = [i for i in 'ab']\n'ab'.title()\nimport os\n")
        self.assertEqual(found, {"unknown:call:print", "list-comprehension", "unknown:method:title",
                                 "unknown:import:os"})

    def test_a_kwarg_the_vocabulary_lacks_is_not_unknown(self) -> None:
        self.assertEqual(self.detect("len(x=1)\n"), {"fn-len"})

    def test_the_codes_own_names_are_not_builtins_or_methods(self) -> None:
        code = "def len(x):\n    return 0\nclass C:\n    def append(self):\n        pass\nlen(1)\nC().append()\n"
        self.assertEqual(self.detect(code), {"unknown:node:FunctionDef", "unknown:node:ClassDef",
                                             "unknown:node:Return"})

    def test_own_names_come_from_outside_the_code_too(self) -> None:
        self.assertEqual(self.detect("pet.feed()\n"), {"unknown:method:feed"})
        self.assertEqual(self.detect("pet.feed()\n", own_names=("feed",)), set())

    def test_code_that_does_not_parse_has_no_features(self) -> None:
        self.assertEqual(self.detect("for x in\n"), set())

    def test_features_job_through_the_cli(self) -> None:
        payload = json.dumps({"mode": "features", "vocabulary": VOCABULARY,
                              "queries": [{"code": "len([])", "own_names": []}, {"code": "import math"}]})
        done = subprocess.run([sys.executable, "py/harness.py"], input=payload, capture_output=True, text=True,
                              cwd=Path(__file__).resolve().parent.parent, timeout=20, check=False)
        self.assertEqual(json.loads(done.stdout), {"features": [["fn-len"], ["math"]]})


PROPERTY: list[harness.Required] = [{"id": "property-decorator", "detect": ["decorator:property"],
                                     "say": "put @property above the method"}]
PROPERTY_TESTS = "def test_area():\n    expect_equal(learner['Box'](2).area, 4, 'Box(2).area')\n"
WITH_PROPERTY = ("class Box:\n    def __init__(self, s):\n        self.s = s\n    @property\n    def area(self):\n"
                 "        return self.s ** 2\n")
WITHOUT_PROPERTY = "class Box:\n    def __init__(self, s):\n        self.area = s ** 2\n"


class RequiredConstructs(unittest.TestCase):
    def test_required_feature_message(self) -> None:
        out = harness.run_tests(WITHOUT_PROPERTY, PROPERTY_TESTS, requires=PROPERTY)
        self.assertEqual([r["passed"] for r in out["results"]], [True, False])
        self.assertEqual(out["results"][1]["message"], "Your code works, but this task asks you to put @property "
                                                       "above the method.")
        self.assertFalse(out["results"][1]["hidden"])

    def test_code_with_the_feature_passes(self) -> None:
        out = harness.run_tests(WITH_PROPERTY, PROPERTY_TESTS, requires=PROPERTY)
        self.assertEqual([r["passed"] for r in out["results"]], [True])

    def test_no_requirements_change_nothing(self) -> None:
        out = harness.run_tests(WITHOUT_PROPERTY, PROPERTY_TESTS)
        self.assertEqual([r["passed"] for r in out["results"]], [True])

    def test_behaviour_failures_come_first_and_alone(self) -> None:
        out = harness.run_tests("class Box:\n    def __init__(self, s):\n        self.area = 0\n", PROPERTY_TESTS,
                                requires=PROPERTY)
        self.assertEqual([r["passed"] for r in out["results"]], [False])

    def test_only_the_first_missing_feature_is_named(self) -> None:
        both: list[harness.Required] = [*PROPERTY, {"id": "lambda", "detect": ["node:Lambda"], "say": "use a lambda"}]
        out = harness.run_tests(WITHOUT_PROPERTY, PROPERTY_TESTS, requires=both)
        self.assertEqual(len(out["results"]), 2)
        self.assertIn("@property", out["results"][1]["message"])

    def test_required_job_through_the_cli(self) -> None:
        payload = json.dumps({"mode": "check", "code": WITHOUT_PROPERTY, "tests": PROPERTY_TESTS, "requires": PROPERTY})
        done = subprocess.run([sys.executable, "py/harness.py"], input=payload, capture_output=True, text=True,
                              cwd=Path(__file__).resolve().parent.parent, timeout=20, check=False)
        self.assertFalse(json.loads(done.stdout)["results"][1]["passed"])


if __name__ == "__main__":
    unittest.main()
