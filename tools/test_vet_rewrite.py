"""rewrites(): each transform changes how the code is written and keeps what it does."""

import contextlib
import io
import unittest
from dataclasses import replace
from pathlib import Path

from vet.adapter import CheckOutcome, Required, Rewrite
from vet.checks.rewrites import first_failure, keeping_required, kept
from vet.model import Item
from vet.python.adapter import PythonAdapter
from vet.python.rewrite import TRANSFORMS, rewrites


def rewritten(code: str, transform: str) -> str:
    """The one rewrite of code by transform; fails the test when there is none."""
    [found] = [r.code for r in rewrites(code) if r.id == transform]
    return found


def results(code: str, call: str, inputs: list[tuple[object, ...]]) -> list[object]:
    """What the function named call returns (or raises) for each input, prints ignored."""
    namespace: dict[str, object] = {}
    exec(code, namespace)
    function = namespace[call]
    assert callable(function)
    found: list[object] = []
    for args in inputs:
        try:
            with contextlib.redirect_stdout(io.StringIO()):
                found.append(function(*args))
        except Exception as e:  # the type of error is part of the behaviour
            found.append(type(e))
    return found


class Transforms(unittest.TestCase):
    def assert_same(self, code: str, transform: str, call: str, inputs: list[tuple[object, ...]]) -> str:
        new = rewritten(code, transform)
        self.assertNotEqual(new, code)
        self.assertEqual(results(new, call, inputs), results(code, call, inputs))
        return new

    def test_rename_locals(self) -> None:
        code = "def total(xs):\n    acc = 0\n    for x in xs:\n        acc += x\n    return acc\n"
        new = self.assert_same(code, "rename-locals", "total", [([],), ([1, 2],)])
        self.assertIn("my_acc", new)
        self.assertIn("my_x", new)
        self.assertIn("def total(xs)", new)

    def test_rename_locals_leaves_comprehension_only_names(self) -> None:
        # x is a comprehension variable here, and a global read elsewhere: renaming it would break the read
        code = "x = 10\ndef f(xs):\n    ys = [x for x in xs]\n    return ys, x\n"
        new = self.assert_same(code, "rename-locals", "f", [([1],)])
        self.assertIn("my_ys", new)
        self.assertNotIn("my_x", new)

    def test_rename_params_one_rewrite_per_name(self) -> None:
        code = "def area(width, height):\n    return width * height\n"
        ids = [r.id for r in rewrites(code) if r.transform == "rename-params"]
        self.assertEqual(ids, ["rename-params:height", "rename-params:width"])
        new = self.assert_same(code, "rename-params:width", "area", [(2, 3)])
        self.assertIn("def area(my_width, height)", new)

    def test_rename_params_skips_a_name_called_by_keyword(self) -> None:
        code = "def f(n, acc):\n    if n == 0:\n        return acc\n    return f(n=n - 1, acc=acc + n)\n"
        self.assertEqual([r for r in rewrites(code) if r.transform == "rename-params"], [])

    def test_renames_and_helpers_skip_other_bindings(self) -> None:
        sources = [
            "def f(v):\n    e = 1\n    try:\n        return int(v)\n"
            "    except ValueError as e:\n        return str(e)\n",
            "def f(v):\n    a = 0\n    match v:\n        case [a, b]:\n            return a + b\n    return a\n",
            "def f(x):\n    import math\n    y = 1\n    return math.floor(x) + y\n",
            "def f(x):\n    def sq(y):\n        return y * y\n    z = 1\n    return sq(x) + z\n",
        ]
        for code in sources:
            with self.subTest(code=code):
                found = {r.transform for r in rewrites(code)}
                self.assertFalse({"rename-locals", "extract-helper"} & found)

    def test_extract_helper_skips_recursion(self) -> None:
        code = "def fact(n):\n    if n < 2:\n        return 1\n    return n * fact(n - 1)\n"
        self.assertEqual([r for r in rewrites(code) if r.transform == "extract-helper"], [])

    def test_rename_params_keeps_self(self) -> None:
        code = "class A:\n    def f(self):\n        return self\n"
        self.assertEqual([r.id for r in rewrites(code) if r.transform == "rename-params"], [])

    def test_comprehension_to_loop(self) -> None:
        code = "def evens(xs):\n    return [x * 2 for x in xs if x % 2 == 0]\n"
        new = self.assert_same(code, "comprehension-to-loop", "evens", [([1, 2, 3, 4],), ([],)])
        self.assertIn("result.append(x * 2)", new)

    def test_comprehension_to_loop_set_and_dict(self) -> None:
        code = "def f(xs):\n    s = {x for x in xs}\n    d = {k: k * 2 for k in xs}\n    return s, d\n"
        new = self.assert_same(code, "comprehension-to-loop", "f", [([1, 1, 2],)])
        self.assertIn("s.add(x)", new)
        self.assertIn("d[k] = k * 2", new)

    def test_comprehension_to_loop_skips_a_leaking_name(self) -> None:
        code = "def f(xs):\n    x = 5\n    ys = [x for x in xs]\n    return ys, x\n"
        self.assertEqual([r for r in rewrites(code) if r.transform == "comprehension-to-loop"], [])

    def test_loop_to_comprehension(self) -> None:
        code = "def evens(xs):\n    out = []\n    for x in xs:\n        if x % 2 == 0:\n            out.append(x)\n" \
               "    return out\n"
        new = self.assert_same(code, "loop-to-comprehension", "evens", [([1, 2, 4],), ([],)])
        self.assertIn("out = [x for x in xs if x % 2 == 0]", new)

    def test_for_to_while(self) -> None:
        code = ("def f(xs):\n    total = 0\n    for x in xs:\n        if x < 0:\n            continue\n"
                "        if x > 9:\n            break\n        total += x\n    return total\n")
        new = self.assert_same(code, "for-to-while", "f", [([1, -2, 3, 10, 4],), ([],), (range(5),)])
        self.assertIn("next(items)", new)

    def test_for_to_while_stays_lazy(self) -> None:
        endless = ("import itertools\ndef root(n):\n    for i in itertools.count():\n        if i * i >= n:\n"
                   "            return i\n")
        self.assert_same(endless, "for-to-while", "root", [(50,)])
        growing = ("def f(xs):\n    xs = list(xs)\n    for x in xs:\n        if x > 0 and len(xs) < 10:\n"
                   "            xs.append(x - 1)\n    return len(xs)\n")
        self.assert_same(growing, "for-to-while", "f", [([3],)])

    def test_fstring_to_concat(self) -> None:
        code = "def show(name, n):\n    return f'{name!r} has {n:>3} and {n}'\n"
        new = self.assert_same(code, "fstring-to-concat", "show", [("Bo", 7)])
        self.assertIn("format(repr(name), '') + ' has ' + format(n, '>3') + ' and ' + format(n, '')", new)

    def test_fstring_to_concat_keeps_format_over_str(self) -> None:
        code = ("class Odd:\n    def __format__(self, spec):\n        return 'F'\n    def __str__(self):\n"
                "        return 'S'\ndef show():\n    return f'{Odd()}'\n")
        self.assert_same(code, "fstring-to-concat", "show", [()])

    def test_augassign_expand(self) -> None:
        code = "def f(n):\n    n += 1\n    n -= 0.5\n    return n\n"
        new = self.assert_same(code, "augassign-expand", "f", [(1,)])
        self.assertIn("n = n + 1", new)

    def test_augassign_expand_leaves_lists_and_arrays(self) -> None:
        self.assertEqual([r for r in rewrites("def f(xs):\n    xs *= 2\n") if r.transform == "augassign-expand"], [])
        arrays = "import numpy as np\ndef f(a):\n    a += 1\n"
        self.assertEqual([r for r in rewrites(arrays) if r.transform == "augassign-expand"], [])

    def test_ifelse_to_ternary(self) -> None:
        code = "def sign(n):\n    if n < 0:\n        word = 'neg'\n    else:\n        word = 'pos'\n    return word\n"
        new = self.assert_same(code, "ifelse-to-ternary", "sign", [(-1,), (2,)])
        self.assertIn("word = 'neg' if n < 0 else 'pos'", new)

    def test_ternary_to_ifelse(self) -> None:
        code = "def larger(a, b):\n    return a if a > b else b\n"
        new = self.assert_same(code, "ternary-to-ifelse", "larger", [(3, 7), (7, 3)])
        self.assertIn("if a > b:", new)

    def test_early_return_to_single(self) -> None:
        code = ("def grade(n):\n    if n >= 90:\n        return 'A'\n    if n >= 50:\n        return 'B'\n"
                "    return 'C'\n")
        new = self.assert_same(code, "early-return-to-single", "grade", [(95,), (60,), (10,)])
        self.assertEqual(new.count("return"), 1)

    def test_early_return_skips_a_return_in_a_loop(self) -> None:
        code = "def first(xs):\n    for x in xs:\n        if x:\n            return x\n    return None\n"
        self.assertEqual([r for r in rewrites(code) if r.transform == "early-return-to-single"], [])

    def test_extract_helper(self) -> None:
        code = "class Box:\n    def __init__(self, n):\n        self.n = n\n\ndef doubled(box, k):\n" \
               "    return box.n * 2 + k\n"
        new = self.assert_same(code, "extract-helper", "doubled", [])
        namespace: dict[str, object] = {}
        exec(new, namespace)
        box = namespace["Box"]
        assert callable(box)
        self.assertEqual(results(new, "doubled", [(box(3), 1)]), [7])
        self.assertIn("return helper(box, k)", new)

    def test_add_docstring(self) -> None:
        code = "def f(n):\n    return n\n"
        new = self.assert_same(code, "add-docstring", "f", [(1,)])
        self.assertIn('"""Give the answer for the inputs."""', new)

    def test_add_debug_print(self) -> None:
        code = 'def f(n):\n    """Doc."""\n    return n\n'
        new = self.assert_same(code, "add-debug-print", "f", [(1,)])
        self.assertIn("\"\"\"Doc.\"\"\"\n    print('debug')", new)


class Guarantees(unittest.TestCase):
    def test_every_transform_has_a_test(self) -> None:
        tested = " ".join(name for name in dir(Transforms) if name.startswith("test_"))
        self.assertEqual([t for t in TRANSFORMS if f"test_{t.replace('-', '_')}" not in tested], [])

    def test_code_that_does_not_parse_has_no_rewrites(self) -> None:
        self.assertEqual(rewrites("def f(:\n"), [])

    def test_rewrites_compile_and_differ(self) -> None:
        code = "def f(xs):\n    out = []\n    for x in xs:\n        out.append(f'{x}')\n    return out\n"
        found = rewrites(code)
        self.assertGreater(len(found), 5)
        for rewrite in found:
            compile(rewrite.code, rewrite.id, "exec")
            self.assertEqual(results(rewrite.code, "f", [([1, 2],)]), [["1", "2"]])


def item(prompt: str, tests: str) -> Item:
    return Item("t", "task", "the solution", Path("."), "", "", tests, False, "fp", "t", None, (), (), prompt, None)


class Check(unittest.TestCase):
    def test_a_parameter_the_prompt_names_keeps_its_name(self) -> None:
        rename = Rewrite("rename-params:n", "rename-params", "")
        self.assertFalse(kept(rename, [item("Write `double(n)`.", "")]))
        self.assertTrue(kept(rename, [item("Write `double`, given a number.", "")]))

    def test_a_rewrite_that_drops_a_required_construct_is_left_out(self) -> None:
        needs = replace(item("", ""), requires=(Required("list-comprehension", ("node:ListComp",), "use one"),))
        code = "def f(xs):\n    return [x + 1 for x in xs]\n"
        found = [r for r in rewrites(code) if r.transform in ("comprehension-to-loop", "add-docstring")]
        self.assertEqual({r.transform for r in found}, {"comprehension-to-loop", "add-docstring"})
        kept_ones = keeping_required(found, [needs], PythonAdapter())
        self.assertEqual({r.transform for r in kept_ones}, {"add-docstring"})
        self.assertEqual(keeping_required(found, [item("", "")], PythonAdapter()), found)

    def test_no_debug_print_where_tests_read_the_output(self) -> None:
        debug = Rewrite("add-debug-print", "add-debug-print", "")
        self.assertFalse(kept(debug, [item("", "PROGRAM = True")]))
        self.assertTrue(kept(debug, [item("", "def test_a(): pass")]))
        program = Item("t", "task", "the solution", Path("."), "", "", "def test_a(): pass", False, "fp", "t",
                       {"stdin": ["int 0..9"]}, (), (), "", None)
        self.assertFalse(kept(debug, [program]))

    def test_first_failure_names_the_test(self) -> None:
        failed: CheckOutcome = {"error": None, "results": [
            {"name": "four", "passed": True, "message": "", "hidden": False},
            {"name": "zero", "passed": False, "message": "expected 0", "hidden": False}]}
        self.assertEqual(first_failure([failed]), "zero: expected 0")
        self.assertEqual(first_failure([None]), "it runs out of time")
        self.assertEqual(first_failure([{"error": "SyntaxError", "results": []}]), "SyntaxError")


if __name__ == "__main__":
    unittest.main()
