"""mutants(): one test per operator, plus the guarantees every mutant keeps (it compiles, the order is stable)."""

import unittest

from vet.python.mutate import mutants


def changed(code: str, operator: str) -> list[str]:
    """The mutated lines of code that differ from the original, for one operator."""
    before = code.splitlines()
    out = []
    for mutant in mutants(code):
        if mutant.operator == operator:
            after = mutant.code.splitlines()
            out.append("\n".join(a for a, b in zip(after, before, strict=False) if a != b) or mutant.code)
    return out


class Operators(unittest.TestCase):
    def test_cmp_swap(self) -> None:
        self.assertEqual(changed("if a < b:\n    x = 1\n", "cmp-swap"),
                         ["if a <= b:", "if a > b:", "if a >= b:", "if a == b:", "if a != b:"])

    def test_is_eq_swap(self) -> None:
        self.assertEqual(changed("ok = x is None\n", "is-eq-swap"), ["ok = x == None"])
        self.assertEqual(changed("ok = x == y\n", "is-eq-swap"), ["ok = x is y"])

    def test_in_swap(self) -> None:
        self.assertEqual(changed("ok = x in xs\n", "in-swap"), ["ok = x not in xs"])

    def test_arith_swap(self) -> None:
        self.assertEqual(changed("y = a + b\n", "arith-swap"),
                         ["y = a - b", "y = a * b", "y = a / b", "y = a // b", "y = a % b"])

    def test_arith_swap_keeps_precedence(self) -> None:
        # a * b + c with * swapped to + must still mean (a + b) + c, written so the reader sees it
        self.assertIn("y = a + b + c", changed("y = a * b + c\n", "arith-swap"))
        self.assertIn("y = a * (b + c)", changed("y = a * (b * c)\n", "arith-swap"))

    def test_augassign_swap(self) -> None:
        found = changed("total = 0\ntotal += x\n", "augassign-swap")
        self.assertIn("total -= x", found)
        self.assertIn("total = x", found)

    def test_const_off_by_one(self) -> None:
        self.assertEqual(changed("n = 3\n", "const-off-by-one"), ["n = 4", "n = 2"])

    def test_const_zero_one(self) -> None:
        self.assertEqual(changed("n = 3.5\n", "const-zero-one"), ["n = 0", "n = 1"])

    def test_bool_swap(self) -> None:
        self.assertEqual(changed("ok = a and b\n", "bool-swap"), ["ok = a or b"])

    def test_not_drop(self) -> None:
        self.assertEqual(changed("ok = not a\n", "not-drop"), ["ok = a"])

    def test_stmt_delete_keeps_the_last_statement(self) -> None:
        code = 'def f(xs):\n    """Sum."""\n    total = 0\n    for x in xs:\n        total += x\n    return total\n'
        found = [m for m in mutants(code) if m.operator == "stmt-delete"]
        self.assertEqual([m.line for m in found], [3, 4])
        self.assertIn("    pass\n    return total", found[1].code)

    def test_return_none(self) -> None:
        self.assertEqual(changed("def f(n):\n    return n * 2\n", "return-none"), ["    return None"])

    def test_return_first_arg_skips_self(self) -> None:
        code = "class A:\n    def f(self, n, m):\n        return m\n"
        self.assertEqual(changed(code, "return-first-arg"), ["        return n"])

    def test_range_bound(self) -> None:
        self.assertEqual(changed("for i in range(1, n):\n    pass\n", "range-bound"),
                         ["for i in range(2, n):", "for i in range(0, n):", "for i in range(1, n + 1):",
                          "for i in range(1, n - 1):"])

    def test_slice_bound(self) -> None:
        self.assertEqual(changed("y = s[:-1]\n", "slice-bound"), ["y = s[:0]", "y = s[:-2]"])

    def test_index_shift(self) -> None:
        self.assertEqual(changed("y = s[i]\n", "index-shift"), ["y = s[i + 1]", "y = s[i - 1]"])
        self.assertEqual(changed("y = d['key']\n", "index-shift"), [])

    def test_args_swap(self) -> None:
        self.assertEqual(changed("y = f(a, b, c)\n", "args-swap"), ["y = f(b, a, c)", "y = f(a, c, b)"])

    def test_method_swap(self) -> None:
        self.assertEqual(changed("s.strip()\n", "method-swap"), ["s.lstrip()", "s.rstrip()"])
        self.assertEqual(changed("xs.append(x)\n", "method-swap"), ["xs.extend(x)"])

    def test_break_continue_swap(self) -> None:
        self.assertEqual(changed("for x in xs:\n    break\n", "break-continue-swap"), ["    continue"])

    def test_annotations_are_not_mutated(self) -> None:
        self.assertEqual(changed("def f(xs: list[int]) -> tuple[int, int]:\n    pass\n", "index-shift"), [])


class EquivalentSites(unittest.TestCase):
    def operators(self, code: str) -> set[str]:
        return {m.operator for m in mutants(code)}

    def test_strip_used_as_a_condition_has_no_mutants(self) -> None:
        for code in ("def f(parts):\n    return [p for p in parts if p.strip()]\n",
                     "def f(s):\n    if s.lstrip():\n        return 1\n    return 2\n",
                     "def f(s):\n    return s.rstrip() or 'x'\n",
                     "def f(s):\n    return not s.strip()\n"):
            with self.subTest(code=code):
                self.assertNotIn("method-swap", self.operators(code))

    def test_strip_whose_value_is_used_still_has_mutants(self) -> None:
        self.assertIn("method-swap", self.operators("def f(s):\n    return s.strip()\n"))

    def test_a_seed_argument_has_no_mutants(self) -> None:
        code = "def f(xs):\n    return split(xs, random_state=1, other=2, seed=3)\n"
        constants = [m for m in mutants(code) if m.operator.startswith("const")]
        self.assertTrue(constants)
        for mutant in constants:
            self.assertIn("random_state=1", mutant.code)
            self.assertIn("seed=3", mutant.code)
            self.assertNotIn("other=2", mutant.code)  # the other argument is still mutated


class Guarantees(unittest.TestCase):
    SOURCE = (
        "def count_short(words, limit=3):\n"
        "    # a comment the splice keeps\n"
        "    found = []\n"
        "    for i in range(len(words)):\n"
        "        if len(words[i]) <= limit and not words[i].isupper():\n"
        "            found.append(words[i].strip())\n"
        "        elif words[i] in ('stop', 'end'):\n"
        "            break\n"
        "    return len(found[1:]) + 1\n"
    )

    def test_mutants_compile(self) -> None:
        found = mutants(self.SOURCE)
        self.assertGreater(len(found), 30)
        for mutant in found:
            with self.subTest(mutant=mutant.id):
                compile(mutant.code, mutant.id, "exec")
                self.assertNotEqual(mutant.code, self.SOURCE)

    def test_mutants_keep_comments(self) -> None:
        self.assertTrue(all("# a comment the splice keeps" in m.code for m in mutants(self.SOURCE)))

    def test_order_is_stable(self) -> None:
        first, second = mutants(self.SOURCE), mutants(self.SOURCE)
        self.assertEqual(first, second)
        self.assertEqual(len({m.id for m in first}), len(first))
        self.assertEqual([m.line for m in first], sorted(m.line for m in first))

    def test_no_duplicate_code(self) -> None:
        found = mutants(self.SOURCE)
        self.assertEqual(len({m.code for m in found}), len(found))

    def test_summary_names_the_change(self) -> None:
        [mutant] = [m for m in mutants("def f(a, b):\n    return a < b\n") if m.summary.endswith("`a <= b`")]
        self.assertEqual(mutant.summary, "line 2: `a < b` became `a <= b`")
        self.assertEqual(mutant.id, "cmp-swap:2:1")

    def test_code_that_does_not_parse_has_no_mutants(self) -> None:
        self.assertEqual(mutants("def f(:\n"), [])


if __name__ == "__main__":
    unittest.main()
