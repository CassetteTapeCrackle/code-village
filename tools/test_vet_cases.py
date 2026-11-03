import ast
import unittest

from vet.adapter import ExprInput, ProgramInput
from vet.cases.generate import generate_inputs
from vet.cases.spec import (
    CallShape,
    DeclError,
    IntT,
    ListT,
    NoCases,
    ObjectShape,
    ProgramShape,
    parse_decl,
    parse_type,
)

LARGER = {"call": "larger", "args": ["int -50..50", "int -50..50"]}
ACCOUNT = {"class": "Account", "init": ["int 0..500"], "methods": {"deposit": ["int 1..200"]},
           "reads": ["balance"], "steps": "2..6"}


def exprs(table: dict[str, object], seed: str = "seed", count: int = 100) -> list[ExprInput]:
    inputs = generate_inputs(parse_decl(table, "here"), seed, count)
    return [i for i in inputs if isinstance(i, ExprInput)]


class ParseDecl(unittest.TestCase):
    def test_function_decl(self) -> None:
        decl = parse_decl(LARGER, "here")
        self.assertEqual(decl.shape, CallShape("larger", (IntT(-50, 50), IntT(-50, 50))))
        self.assertEqual((decl.compare, decl.count), ("exact", 100))

    def test_object_decl(self) -> None:
        shape = parse_decl(ACCOUNT, "here").shape
        assert isinstance(shape, ObjectShape)
        self.assertEqual((shape.cls, shape.reads, shape.steps), ("Account", ("balance",), (2, 6)))

    def test_program_decl(self) -> None:
        self.assertEqual(parse_decl({"stdin": ["int 0..120"]}, "here").shape, ProgramShape((IntT(0, 120),)))

    def test_none_decl(self) -> None:
        self.assertEqual(parse_decl({"none": "random output"}, "here").shape, NoCases("random output"))

    def test_nested_types(self) -> None:
        self.assertEqual(parse_type("list<int 0..9> 0..5"), ListT(IntT(0, 9), 0, 5))
        for text in ["dict<word, list<float 0..1>> 1..3", "tuple<int 0..3, optional<str 0..4>>",
                     "frame{age: int 0..99, name: word} 1..4", "matrix<float -1..1> 1..3 2..2",
                     "choice red|green|blue", "set<bool>", "array<int 0..5> 2..6"]:
            with self.subTest(text=text):
                parse_type(text)

    def test_bad_decl_names_the_field(self) -> None:
        bad: list[tuple[dict[str, object], str]] = [
            ({"call": "f", "args": ["integer 0..3"]}, "here [cases] args[0]"),
            ({"call": "f", "args": ["int 0..3"], "compare": "close"}, "here [cases] compare"),
            ({"call": "f", "args": ["list<int 0..3> 0..50"]}, "here [cases] args[0]"),
            ({"call": "f", "arg": ["int 0..3"]}, "here [cases] arg"),
            ({"args": ["int 0..3"]}, "here [cases]"),
            ({"call": "f", "args": ["int 0..3"], "mutates": [2]}, "here [cases] mutates"),
            ({"stdin": ["list<int 0..3>"]}, "here [cases] stdin[0]"),
        ]
        for table, where in bad:
            with self.subTest(table=table), self.assertRaises(DeclError) as caught:
                parse_decl(table, "here")
            self.assertTrue(str(caught.exception).startswith(where + ":"), str(caught.exception))


class Generate(unittest.TestCase):
    def test_same_seed_same_inputs(self) -> None:
        table = {"call": "f", "args": ["dict<word, set<str 0..3>> 0..4", "frame{a: float 0..1} 0..3"]}
        self.assertEqual(exprs(table, "w1/x"), exprs(table, "w1/x"))
        self.assertNotEqual(exprs(table, "w1/x"), exprs(table, "w1/y"))

    def test_edges_come_first(self) -> None:
        first = [ast.literal_eval(i.expr.removeprefix("f(").removesuffix(")")) for i in
                 exprs({"call": "f", "args": ["int -50..50"]})[:5]]
        for edge in (-50, 50, 0):
            self.assertIn(edge, first)

    def test_container_edges_come_first(self) -> None:
        first = [i.show for i in exprs({"call": "f", "args": ["list<int 0..9> 0..5"]})[:4]]
        self.assertIn("f([])", first)
        self.assertTrue(any(s.count(",") == 0 and s != "f([])" for s in first), first)

    def test_rest_sorted_by_size(self) -> None:
        shows = [i.show for i in exprs({"call": "f", "args": ["list<int 0..99> 0..12"]})]
        rest = shows[5:]
        self.assertEqual(rest, sorted(rest, key=len))

    def test_inputs_are_distinct_and_counted(self) -> None:
        shows = [i.show for i in exprs({"call": "f", "args": ["int -50..50", "int -50..50"]}, count=60)]
        self.assertEqual(len(shows), 60)
        self.assertEqual(len(set(shows)), 60)

    def test_small_input_space_gives_what_exists(self) -> None:
        self.assertEqual(sorted(i.show for i in exprs({"call": "f", "args": ["bool"]})), ["f(False)", "f(True)"])

    def test_generated_sizes_stay_small(self) -> None:
        table = {"call": "f", "args": ["list<str 0..20> 0..12", "dict<int 0..99, word> 0..12"]}
        for case in exprs(table, count=200):
            args = ast.literal_eval(case.expr.removeprefix("f"))
            self.assertLessEqual(len(args[0]), 12)
            self.assertLessEqual(len(args[1]), 12)
            self.assertTrue(all(len(s) <= 20 for s in args[0]))

    def test_values_stay_in_range(self) -> None:
        for case in exprs({"call": "f", "args": ["float -1.5..2.5"]}):
            value = ast.literal_eval(case.expr.removeprefix("f(").removesuffix(")"))
            self.assertTrue(-1.5 <= value <= 2.5, value)

    def test_object_steps_are_valid_python(self) -> None:
        cases = exprs(ACCOUNT)
        self.assertEqual(len(cases), 100)
        for case in cases:
            compile(case.setup, "setup", "exec")
            compile(case.expr, "expr", "eval")
            self.assertTrue(case.show.startswith("obj = Account("), case.show)
            self.assertTrue(case.expr.endswith("obj.balance]"), case.expr)
            self.assertIn(case.expr.count("obj.deposit("), range(2, 7))

    def test_mutated_argument_is_returned_after_the_call(self) -> None:
        [case, *_] = exprs({"call": "sort_it", "args": ["list<int 0..9> 1..3"], "mutates": [0]})
        namespace: dict[str, object] = {"sort_it": lambda xs: xs.sort()}
        exec(case.setup, namespace)
        result, after = eval(case.expr, namespace)
        self.assertIsNone(result)
        self.assertEqual(after, sorted(after))
        self.assertTrue(case.show.startswith("sort_it(["), case.show)

    def test_library_types_import_their_library(self) -> None:
        [case, *_] = exprs({"call": "f", "args": ["array<int 0..5> 1..3", "frame{a: int 0..3} 1..2"],
                            "setup": "import math"})
        self.assertEqual(case.setup.splitlines(), ["import math", "import numpy as np", "import pandas as pd"])
        self.assertIn("np.array([", case.expr)
        self.assertIn("pd.DataFrame({'a': [", case.expr)

    def test_program_inputs_are_typed_lines(self) -> None:
        inputs = generate_inputs(parse_decl({"stdin": ["int 0..120", "word"]}, "here"), "s", 30)
        assert all(isinstance(i, ProgramInput) for i in inputs)
        first = inputs[0]
        assert isinstance(first, ProgramInput)
        self.assertEqual(first.stdin[0], "0")
        self.assertEqual(first.show, f"typing 0 then {first.stdin[1]}")

    def test_none_decl_generates_nothing(self) -> None:
        self.assertEqual(generate_inputs(parse_decl({"none": "random"}, "here"), "s", 100), [])


if __name__ == "__main__":
    unittest.main()
