"""mutants(): broken versions of a solution, one small change each, in a stable order.

The order and ids depend on the source alone, so the later "Spot the bug" mode can regenerate the same broken
versions from a solution. Each change is spliced into the original text, so the rest keeps its formatting.
"""

import ast
import copy
import warnings
from collections import Counter
from collections.abc import Callable, Iterator

from ..adapter import Mutant

CMP_OPS: tuple[type[ast.cmpop], ...] = (ast.Lt, ast.LtE, ast.Gt, ast.GtE, ast.Eq, ast.NotEq)
ARITH_OPS: tuple[type[ast.operator], ...] = (ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv, ast.Mod)
CMP_PAIRS: dict[type[ast.cmpop], type[ast.cmpop]] = {ast.Is: ast.Eq, ast.Eq: ast.Is, ast.IsNot: ast.NotEq,
                                                     ast.NotEq: ast.IsNot}
IN_PAIRS: dict[type[ast.cmpop], type[ast.cmpop]] = {ast.In: ast.NotIn, ast.NotIn: ast.In}
RANGE_ARGS = 3  # start, stop, step
METHOD_GROUPS = (("append", "extend"), ("strip", "lstrip", "rstrip"), ("lower", "upper"), ("sort", "reverse"))

Positioned = ast.stmt | ast.expr
Change = tuple[Positioned, ast.AST]  # the positioned node to replace, and what replaces it
Operator = Callable[[list[ast.AST]], Iterator[Change]]


def _with(node: ast.AST, **fields: object) -> ast.AST:
    """A shallow copy of node with some fields replaced."""
    changed = copy.copy(node)
    for name, value in fields.items():
        setattr(changed, name, value)
    return changed


def _int_value(node: ast.AST) -> int | None:
    """The int a literal like 3 or -3 stands for; None for anything else (bools included)."""
    if isinstance(node, ast.Constant) and type(node.value) is int:
        return node.value
    if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.USub):
        inner = _int_value(node.operand)
        return None if inner is None else -inner
    return None


def _int_node(value: int) -> ast.expr:
    # parsed, so -1 is the UnaryOp the parser makes and the splice check compares like with like
    node: ast.expr = ast.parse(str(value), mode="eval").body
    return node


def _shifted(node: ast.expr, delta: int) -> ast.expr:
    """node plus delta: a literal is folded (3 becomes 4), anything else becomes `node + 1` or `node - 1`."""
    value = _int_value(node)
    if value is not None:
        return _int_node(value + delta)
    return ast.BinOp(node, ast.Add() if delta > 0 else ast.Sub(), ast.Constant(abs(delta)))


def _cmp_ops(nodes: list[ast.AST], swaps: Callable[[type[ast.cmpop]], list[type[ast.cmpop]]]) -> Iterator[Change]:
    for node in nodes:
        if isinstance(node, ast.Compare):
            for i, op in enumerate(node.ops):
                for other in swaps(type(op)):
                    yield node, _with(node, ops=[*node.ops[:i], other(), *node.ops[i + 1:]])


def cmp_swap(nodes: list[ast.AST]) -> Iterator[Change]:
    yield from _cmp_ops(nodes, lambda op: [o for o in CMP_OPS if o is not op] if op in CMP_OPS else [])


def is_eq_swap(nodes: list[ast.AST]) -> Iterator[Change]:
    yield from _cmp_ops(nodes, lambda op: [CMP_PAIRS[op]] if op in CMP_PAIRS else [])


def in_swap(nodes: list[ast.AST]) -> Iterator[Change]:
    yield from _cmp_ops(nodes, lambda op: [IN_PAIRS[op]] if op in IN_PAIRS else [])


def arith_swap(nodes: list[ast.AST]) -> Iterator[Change]:
    for node in nodes:
        if isinstance(node, ast.BinOp) and type(node.op) in ARITH_OPS:
            for other in ARITH_OPS:
                if other is not type(node.op):
                    yield node, _with(node, op=other())


def augassign_swap(nodes: list[ast.AST]) -> Iterator[Change]:
    """`x += y` to every other arithmetic operator, and to plain `x = y`."""
    for node in nodes:
        if isinstance(node, ast.AugAssign) and type(node.op) in ARITH_OPS:
            for other in ARITH_OPS:
                if other is not type(node.op):
                    yield node, _with(node, op=other())
            yield node, ast.copy_location(ast.Assign(targets=[node.target], value=node.value), node)


def const_off_by_one(nodes: list[ast.AST]) -> Iterator[Change]:
    for node in nodes:
        if isinstance(node, ast.Constant) and type(node.value) is int:
            yield node, _int_node(node.value + 1)
            yield node, _int_node(node.value - 1)


def const_zero_one(nodes: list[ast.AST]) -> Iterator[Change]:
    for node in nodes:
        if isinstance(node, ast.Constant) and type(node.value) in (int, float):
            for value in (0, 1):
                if node.value != value:
                    yield node, ast.Constant(value)


def bool_swap(nodes: list[ast.AST]) -> Iterator[Change]:
    for node in nodes:
        if isinstance(node, ast.BoolOp):
            yield node, _with(node, op=ast.Or() if isinstance(node.op, ast.And) else ast.And())


def not_drop(nodes: list[ast.AST]) -> Iterator[Change]:
    for node in nodes:
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, ast.Not):
            yield node, node.operand


def _is_docstring(node: ast.stmt) -> bool:
    return isinstance(node, ast.Expr) and isinstance(node.value, ast.Constant) and isinstance(node.value.value, str)


def stmt_delete(nodes: list[ast.AST]) -> Iterator[Change]:
    """Every statement but the last of its block becomes `pass`, which keeps the block valid."""
    for node in nodes:
        for _, value in ast.iter_fields(node):
            if isinstance(value, list) and value and isinstance(value[0], ast.stmt):
                for stmt in value[:-1]:
                    if not _is_docstring(stmt):
                        yield stmt, ast.Pass()


def _is_none(node: ast.expr) -> bool:
    return isinstance(node, ast.Constant) and node.value is None


def return_none(nodes: list[ast.AST]) -> Iterator[Change]:
    for node in nodes:
        if isinstance(node, ast.Return) and node.value is not None and not _is_none(node.value):
            yield node.value, ast.Constant(None)


def _own_returns(function: ast.FunctionDef | ast.AsyncFunctionDef) -> Iterator[ast.Return]:
    """The returns of function itself, not of functions or classes defined inside it."""
    todo: list[ast.AST] = list(function.body)
    while todo:
        node = todo.pop(0)
        if isinstance(node, ast.Return):
            yield node
        if not isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef | ast.Lambda):
            todo.extend(ast.iter_child_nodes(node))


def return_first_arg(nodes: list[ast.AST]) -> Iterator[Change]:
    """`return <expr>` becomes `return <first parameter>`; `self` and `cls` do not count."""
    for node in nodes:
        if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef):
            params = [a.arg for a in [*node.args.posonlyargs, *node.args.args] if a.arg not in ("self", "cls")]
            if not params:
                continue
            for ret in _own_returns(node):
                if ret.value is not None and not (isinstance(ret.value, ast.Name) and ret.value.id == params[0]):
                    yield ret.value, ast.Name(params[0], ast.Load())


def range_bound(nodes: list[ast.AST]) -> Iterator[Change]:
    """The start and stop of range() one more and one less."""
    for node in nodes:
        if not (isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "range"):
            continue
        if node.keywords or not 1 <= len(node.args) <= RANGE_ARGS or any(isinstance(a, ast.Starred) for a in node.args):
            continue
        for i in range(min(len(node.args), 2)):
            for delta in (1, -1):
                yield node, _with(node, args=[*node.args[:i], _shifted(node.args[i], delta), *node.args[i + 1:]])


def slice_bound(nodes: list[ast.AST]) -> Iterator[Change]:
    for node in nodes:
        if isinstance(node, ast.Subscript) and isinstance(node.slice, ast.Slice):
            for side in ("lower", "upper"):
                bound = getattr(node.slice, side)
                if bound is not None:
                    for delta in (1, -1):
                        yield node, _with(node, slice=_with(node.slice, **{side: _shifted(bound, delta)}))


def index_shift(nodes: list[ast.AST]) -> Iterator[Change]:
    """`s[i]` to `s[i + 1]` and `s[i - 1]`; string keys, slices and tuples are left alone."""
    for node in nodes:
        if not isinstance(node, ast.Subscript) or isinstance(node.slice, ast.Slice | ast.Tuple):
            continue
        if isinstance(node.slice, ast.Constant) and type(node.slice.value) is not int:
            continue
        for delta in (1, -1):
            yield node, _with(node, slice=_shifted(node.slice, delta))


def args_swap(nodes: list[ast.AST]) -> Iterator[Change]:
    """Two neighbouring positional arguments of a call change places."""
    for node in nodes:
        if isinstance(node, ast.Call) and not any(isinstance(a, ast.Starred) for a in node.args):
            for i in range(len(node.args) - 1):
                args = list(node.args)
                args[i], args[i + 1] = args[i + 1], args[i]
                yield node, _with(node, args=args)


def method_swap(nodes: list[ast.AST]) -> Iterator[Change]:
    for node in nodes:
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute):
            for group in METHOD_GROUPS:
                if node.func.attr in group:
                    for other in group:
                        if other != node.func.attr:
                            yield node, _with(node, func=_with(node.func, attr=other))


def break_continue_swap(nodes: list[ast.AST]) -> Iterator[Change]:
    for node in nodes:
        if isinstance(node, ast.Break):
            yield node, ast.Continue()
        elif isinstance(node, ast.Continue):
            yield node, ast.Break()


OPERATORS: dict[str, Operator] = {
    "cmp-swap": cmp_swap, "is-eq-swap": is_eq_swap, "in-swap": in_swap, "arith-swap": arith_swap,
    "augassign-swap": augassign_swap, "const-off-by-one": const_off_by_one, "const-zero-one": const_zero_one,
    "bool-swap": bool_swap, "not-drop": not_drop, "stmt-delete": stmt_delete, "return-none": return_none,
    "return-first-arg": return_first_arg, "range-bound": range_bound, "slice-bound": slice_bound,
    "index-shift": index_shift, "args-swap": args_swap, "method-swap": method_swap,
    "break-continue-swap": break_continue_swap,
}


def _annotations(tree: ast.Module) -> set[int]:
    """ids of every node inside a type annotation: changing one changes no behaviour worth testing."""
    roots: list[ast.AST] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.arg | ast.AnnAssign) and node.annotation is not None:
            roots.append(node.annotation)
        if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef) and node.returns is not None:
            roots.append(node.returns)
    return {id(inner) for root in roots for inner in ast.walk(root)}


def _parents(tree: ast.Module) -> dict[int, tuple[ast.AST, str, int | None]]:
    """Where each node sits: its parent, the field, and the index when the field is a list."""
    found: dict[int, tuple[ast.AST, str, int | None]] = {}
    for node in ast.walk(tree):
        for field, value in ast.iter_fields(node):
            if isinstance(value, list):
                found.update((id(child), (node, field, i)) for i, child in enumerate(value)
                             if isinstance(child, ast.AST))
            elif isinstance(value, ast.AST):
                found[id(value)] = (node, field, None)
    return found


class _Source:
    """The original text and tree, and how to put one change into the text."""

    def __init__(self, code: str, tree: ast.Module) -> None:
        self.data = code.encode()
        self.tree = tree
        self.parents = _parents(tree)
        self.starts = [0]
        for line in code.encode().splitlines(keepends=True):
            self.starts.append(self.starts[-1] + len(line))

    def _offsets(self, node: Positioned) -> tuple[int, int]:
        # ast offsets are UTF-8 byte columns, so the splice works on bytes
        end_line, end_col = node.end_lineno or node.lineno, node.end_col_offset or node.col_offset
        return self.starts[node.lineno - 1] + node.col_offset, self.starts[end_line - 1] + end_col

    def segment(self, node: Positioned) -> str:
        start, end = self._offsets(node)
        return self.data[start:end].decode()

    def _swapped_unparse(self, target: Positioned, replacement: ast.AST) -> str:
        parent, field, index = self.parents[id(target)]
        if index is None:
            setattr(parent, field, replacement)
        else:
            getattr(parent, field)[index] = replacement
        try:
            return ast.unparse(self.tree)
        finally:
            if index is None:
                setattr(parent, field, target)
            else:
                getattr(parent, field)[index] = target

    def apply(self, target: Positioned, replacement: ast.AST) -> str:
        """The code with target replaced: spliced when the splice means the intended tree, else unparsed whole."""
        whole = self._swapped_unparse(target, replacement)
        wanted = ast.dump(ast.parse(whole))
        start, end = self._offsets(target)
        text = ast.unparse(replacement)
        for candidate in (text, f"({text})"):
            spliced = (self.data[:start] + candidate.encode() + self.data[end:]).decode()
            try:
                if ast.dump(ast.parse(spliced)) == wanted:
                    return spliced
            except SyntaxError:
                continue
        return whole


def _compiles(code: str) -> bool:
    try:
        compile(code, "<mutant>", "exec")
    except SyntaxError:
        return False
    return True


def _first_line(text: str) -> str:
    lines = text.strip().splitlines()
    return lines[0] + (" ..." if len(lines) > 1 else "")


def mutants(code: str) -> list[Mutant]:
    """Every mutant of code that still compiles, ordered by position then operator; duplicates kept once."""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", SyntaxWarning)  # `x is 1` warns but compiles, and a mutant may write it
        try:
            tree = ast.parse(code)
        except SyntaxError:
            return []
        source = _Source(code, tree)
        skip = _annotations(tree)
        nodes = [n for n in ast.walk(tree) if id(n) not in skip]
        changes = [(target.lineno, target.col_offset, rank, seq, name, target, new)
                   for rank, (name, operator) in enumerate(OPERATORS.items())
                   for seq, (target, new) in enumerate(operator(nodes))]
        changes.sort(key=lambda change: change[:4])
        found: list[Mutant] = []
        seen = {code}
        per_line: Counter[tuple[str, int]] = Counter()
        for line, _, _, _, name, target, new in changes:
            mutated = source.apply(target, new)
            if mutated in seen or not _compiles(mutated):
                continue
            seen.add(mutated)
            per_line[name, line] += 1
            summary = f"line {line}: `{_first_line(source.segment(target))}` became `{_first_line(ast.unparse(new))}`"
            found.append(Mutant(f"{name}:{line}:{per_line[name, line]}", name, line, mutated, summary))
        return found
