"""rewrites(): versions of a solution that behave the same but are written another way, as a learner might.

Each transform rewrites every place it applies to and skips the places where it could change behaviour (a loop
variable read after the loop, a name the code rebinds, aliasing through in-place operators). Rewrites are
unparsed whole: they are run, never shown, so formatting does not matter.
"""

import ast
import copy
from collections.abc import Callable, Iterator

from ..adapter import Rewrite

Function = ast.FunctionDef | ast.AsyncFunctionDef
SCOPES = (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda, ast.ClassDef)
COMPREHENSIONS = (ast.ListComp, ast.SetComp, ast.DictComp)
UNMOVABLE = (ast.Lambda, ast.NamedExpr, ast.Await, ast.Yield, ast.YieldFrom, ast.GeneratorExp)
INTROSPECTION = {"locals", "vars", "eval", "exec"}
CONVERSIONS = {ord("r"): "repr", ord("s"): "str", ord("a"): "ascii"}
MIN_RETURNS = 2  # a function with one return already has a single exit
DOCSTRING = "Give the answer for the inputs."


def _bound_names(tree: ast.AST) -> set[str]:
    """Every name the code binds or reads, so a new name can avoid them all."""
    names: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name):
            names.add(node.id)
        elif isinstance(node, ast.arg):
            names.add(node.arg)
        elif isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef):
            names.add(node.name)
        elif isinstance(node, ast.alias):
            names.add((node.asname or node.name).split(".")[0])
    return names


def _fresh(base: str, taken: set[str]) -> str:
    name, n = base, 1
    while name in taken:
        n += 1
        name = f"{base}{n}"
    taken.add(name)
    return name


def _own_nodes(scope: ast.AST) -> Iterator[ast.AST]:
    """The nodes of a function or module body, without the bodies of the functions and classes inside it."""
    todo = list(ast.iter_child_nodes(scope))
    while todo:
        node = todo.pop()
        yield node
        if not isinstance(node, SCOPES):
            todo.extend(ast.iter_child_nodes(node))


def _comprehension_targets(scope: ast.AST) -> set[str]:
    return {n.id for c in _own_nodes(scope) if isinstance(c, ast.comprehension)
            for n in ast.walk(c.target) if isinstance(n, ast.Name)}


def _inner_bindings(function: Function) -> set[str]:
    """Names that a function, lambda or class inside function binds for itself."""
    found: set[str] = set()
    for node in ast.walk(function):
        if node is not function and isinstance(node, SCOPES):
            found |= {n.arg for n in ast.walk(node) if isinstance(n, ast.arg)}
            found |= {n.id for n in ast.walk(node) if isinstance(n, ast.Name) and not isinstance(n.ctx, ast.Load)}
    return found


def _locals(function: Function) -> set[str]:
    """Names function assigns itself, without parameters, global and nonlocal names, and comprehension variables."""
    stored = {n.id for n in _own_nodes(function) if isinstance(n, ast.Name) and not isinstance(n.ctx, ast.Load)}
    declared = {name for n in _own_nodes(function) if isinstance(n, ast.Global | ast.Nonlocal) for name in n.names}
    only_in_comprehensions = _comprehension_targets(function) - {
        n.id for n in _own_nodes(function) if isinstance(n, ast.Name) and not isinstance(n.ctx, ast.Load)
        and not _in_comprehension_target(function, n)}
    return stored - declared - only_in_comprehensions - _params(function)


def _in_comprehension_target(scope: ast.AST, name: ast.Name) -> bool:
    return any(name in ast.walk(c.target) for c in _own_nodes(scope) if isinstance(c, ast.comprehension))


def _params(function: Function) -> set[str]:
    args = function.args
    every = [*args.posonlyargs, *args.args, *args.kwonlyargs, *(a for a in (args.vararg, args.kwarg) if a)]
    return {a.arg for a in every}


def _introspects(function: Function) -> bool:
    return any(isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id in INTROSPECTION
               for n in ast.walk(function))


def _binds_without_names(function: Function) -> bool:
    """True when function binds a name other than by assignment: `except ... as`, `match` captures, a local
    import, or a function or class defined inside it. Renaming or moving code there needs scope analysis."""
    binders = (ast.ExceptHandler, ast.MatchAs, ast.MatchStar, ast.MatchMapping, ast.Import, ast.ImportFrom,
               ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)
    return any(isinstance(n, binders) for n in ast.walk(function) if n is not function)


def _unsafe(function: Function) -> bool:
    return _introspects(function) or _binds_without_names(function)


def _functions(tree: ast.AST) -> list[Function]:
    return [n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef | ast.AsyncFunctionDef)]


def _rename(function: Function, mapping: dict[str, str]) -> None:
    """Rename names (and the function's own parameters) inside function; attributes and keywords stay."""
    for node in ast.walk(function):
        if isinstance(node, ast.Name) and node.id in mapping:
            node.id = mapping[node.id]
        elif isinstance(node, ast.arg) and node.arg in mapping and node in ast.walk(function.args):
            node.arg = mapping[node.arg]


def rename_locals(tree: ast.Module) -> None:
    taken = _bound_names(tree)
    for function in _functions(tree):
        if _unsafe(function):
            continue
        names = sorted(_locals(function) - _inner_bindings(function))
        _rename(function, {name: _fresh(f"my_{name}", taken) for name in names})


def _param_rewrites(tree: ast.Module) -> Iterator[tuple[str, ast.Module]]:
    """One rewrite per parameter name: every function with that parameter calls it something else."""
    keywords = {n.arg for n in ast.walk(tree) if isinstance(n, ast.keyword)}
    # a call by keyword inside the code (recursion, a helper) would break with the new name
    names = sorted({p for f in _functions(tree) for p in _params(f)} - {"self", "cls"} - keywords)
    for name in names:
        changed = copy.deepcopy(tree)
        new = _fresh(f"my_{name}", _bound_names(changed))
        for function in _functions(changed):
            if name in _params(function) and name not in _inner_bindings(function) and not _unsafe(function):
                _rename(function, {name: new})
        yield f"rename-params:{name}", changed


def _used_outside(tree: ast.AST, part: ast.AST, names: set[str]) -> bool:
    inside = {id(n) for n in ast.walk(part)}
    return any(isinstance(n, ast.Name) and n.id in names and id(n) not in inside for n in ast.walk(tree))


def _target_names(target: ast.AST) -> set[str]:
    return {n.id for n in ast.walk(target) if isinstance(n, ast.Name)}


def _collect(comp: ast.ListComp | ast.SetComp | ast.DictComp, into: str) -> ast.stmt:
    """The statement that puts one item of comp into the collection named into."""
    target = ast.Name(into, ast.Load())
    if isinstance(comp, ast.DictComp):
        return ast.Assign(targets=[ast.Subscript(target, comp.key, ast.Store())], value=comp.value)
    method = "append" if isinstance(comp, ast.ListComp) else "add"
    return ast.Expr(ast.Call(ast.Attribute(target, method, ast.Load()), [comp.elt], []))


def _loops(comp: ast.ListComp | ast.SetComp | ast.DictComp, into: str) -> ast.stmt:
    body: ast.stmt = _collect(comp, into)
    for generator in reversed(comp.generators):
        for test in reversed(generator.ifs):
            body = ast.If(test, [body], [])
        body = ast.For(generator.target, generator.iter, [body], [])
    return body


def _empty(comp: ast.ListComp | ast.SetComp | ast.DictComp) -> ast.expr:
    if isinstance(comp, ast.ListComp):
        return ast.List([], ast.Load())
    if isinstance(comp, ast.DictComp):
        return ast.Dict([], [])
    return ast.Call(ast.Name("set", ast.Load()), [], [])


class _Statements(ast.NodeTransformer):
    """A transformer that may turn one statement into several; subclasses set `changes` per statement kind."""

    def __init__(self, tree: ast.Module) -> None:
        self.tree = tree
        self.taken = _bound_names(tree)


class _ComprehensionToLoop(_Statements):
    def _rewrite(self, value: ast.expr, into: str | None) -> list[ast.stmt] | None:
        if not isinstance(value, COMPREHENSIONS) or any(g.is_async for g in value.generators):
            return None
        targets = set().union(*(_target_names(g.target) for g in value.generators))
        if _used_outside(self.tree, value, targets) or (into and into in _target_names(value)):
            return None
        name = into or _fresh("result", self.taken)
        return [ast.Assign(targets=[ast.Name(name, ast.Store())], value=_empty(value)), _loops(value, name)]

    def visit_Return(self, node: ast.Return) -> ast.AST | list[ast.stmt]:
        made = self._rewrite(node.value, None) if node.value else None
        if made is None:
            return node
        assign = made[0]
        assert isinstance(assign, ast.Assign)
        return [*made, ast.Return(ast.Name(_target_names(assign.targets[0]).pop(), ast.Load()))]

    def visit_Assign(self, node: ast.Assign) -> ast.AST | list[ast.stmt]:
        if len(node.targets) != 1 or not isinstance(node.targets[0], ast.Name):
            return node
        return self._rewrite(node.value, node.targets[0].id) or node


def comprehension_to_loop(tree: ast.Module) -> None:
    _ComprehensionToLoop(tree).visit(tree)


def _appended(stmt: ast.stmt, into: str) -> ast.expr | None:
    """The value of `into.append(value)`, or None for any other statement."""
    if not (isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Call) and len(stmt.value.args) == 1):
        return None
    func = stmt.value.func
    if isinstance(func, ast.Attribute) and func.attr == "append" and isinstance(func.value, ast.Name):
        return stmt.value.args[0] if func.value.id == into and not stmt.value.keywords else None
    return None


def _as_comprehension(tree: ast.Module, start: ast.stmt, loop: ast.stmt) -> ast.Assign | None:
    """`xs = []` then `for x in it: [if c:] xs.append(e)` as `xs = [e for x in it if c]`."""
    if not (isinstance(start, ast.Assign) and len(start.targets) == 1 and isinstance(start.targets[0], ast.Name)
            and isinstance(start.value, ast.List) and not start.value.elts):
        return None
    into = start.targets[0].id
    if not isinstance(loop, ast.For) or loop.orelse or len(loop.body) != 1:
        return None
    inner, ifs = loop.body[0], list[ast.expr]()
    if isinstance(inner, ast.If) and not inner.orelse and len(inner.body) == 1:
        ifs = [inner.test]
        inner = inner.body[0]
    elt = _appended(inner, into)
    if elt is None or into in _loads(loop.iter, elt, *ifs):
        return None
    if _used_outside(tree, loop, _target_names(loop.target)):
        return None
    generator = ast.comprehension(loop.target, loop.iter, ifs, 0)
    return ast.Assign(targets=start.targets, value=ast.ListComp(elt, [generator]))


def _loads(*parts: ast.AST) -> set[str]:
    return {n.id for part in parts for n in ast.walk(part) if isinstance(n, ast.Name)}


def _blocks(tree: ast.AST) -> Iterator[list[ast.stmt]]:
    """Every statement list in the tree: module, function, loop and branch bodies."""
    for node in ast.walk(tree):
        for _, value in ast.iter_fields(node):
            if isinstance(value, list) and value and isinstance(value[0], ast.stmt):
                yield value


def loop_to_comprehension(tree: ast.Module) -> None:
    for block in list(_blocks(tree)):
        i = 0
        while i < len(block) - 1:
            made = _as_comprehension(tree, block[i], block[i + 1])
            if made is not None:
                block[i:i + 2] = [made]
            i += 1


def _load(name: str) -> ast.Name:
    return ast.Name(name, ast.Load())


class _ForToWhile(_Statements):
    def visit_For(self, node: ast.For) -> ast.AST | list[ast.stmt]:
        self.generic_visit(node)
        if node.orelse:
            return node
        items = _fresh("items", self.taken)
        # next() stays lazy like the for loop (an endless iterator, a list that grows while it is walked), and
        # taking the item first keeps `continue` moving on to the next one
        take = ast.Try([ast.Assign(targets=[node.target], value=ast.Call(_load("next"), [_load(items)], []))],
                       [ast.ExceptHandler(_load("StopIteration"), None, [ast.Break()])], [], [])
        return [ast.Assign(targets=[ast.Name(items, ast.Store())], value=ast.Call(_load("iter"), [node.iter], [])),
                ast.While(ast.Constant(True), [take, *node.body], [])]


def for_to_while(tree: ast.Module) -> None:
    if not {"iter", "next", "StopIteration"} & _bound_names_assigned(tree):
        _ForToWhile(tree).visit(tree)


def _bound_names_assigned(tree: ast.AST) -> set[str]:
    """Names the code itself binds (so a builtin it shadows is not used by a rewrite)."""
    stored = {n.id for n in ast.walk(tree) if isinstance(n, ast.Name) and not isinstance(n.ctx, ast.Load)}
    defined = {n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef)}
    imported = {(n.asname or n.name).split(".")[0] for n in ast.walk(tree) if isinstance(n, ast.alias)}
    params = {n.arg for n in ast.walk(tree) if isinstance(n, ast.arg)}
    return stored | defined | imported | params


def _piece(part: ast.expr) -> ast.expr | None:
    """One part of an f-string as a str expression; None when its format spec has fields of its own."""
    if not isinstance(part, ast.FormattedValue):
        return part
    value = part.value
    if part.conversion in CONVERSIONS:
        value = ast.Call(ast.Name(CONVERSIONS[part.conversion], ast.Load()), [value], [])
    if part.format_spec is None:  # f"{x}" calls format(x, ""), which may differ from str(x)
        return ast.Call(ast.Name("format", ast.Load()), [value, ast.Constant("")], [])
    spec = part.format_spec
    if not isinstance(spec, ast.JoinedStr) or not all(isinstance(v, ast.Constant) for v in spec.values):
        return None
    text = "".join(str(v.value) for v in spec.values if isinstance(v, ast.Constant))
    return ast.Call(ast.Name("format", ast.Load()), [value, ast.Constant(text)], [])


class _FstringToConcat(ast.NodeTransformer):
    def visit_JoinedStr(self, node: ast.JoinedStr) -> ast.AST:
        pieces = [_piece(part) for part in node.values]
        if any(p is None for p in pieces):
            return node
        parts = [p for p in pieces if p is not None]
        if not parts:
            return ast.Constant("")
        joined = parts[0]
        for part in parts[1:]:
            joined = ast.BinOp(joined, ast.Add(), part)
        return joined


def fstring_to_concat(tree: ast.Module) -> None:
    if not {"repr", "ascii", "format"} & _bound_names_assigned(tree):
        _FstringToConcat().visit(tree)


def _uses_arrays(tree: ast.AST) -> bool:
    # NumPy and pandas `+=` changes the object in place, so `a = a + 1` would leave other names on the old one
    return any(isinstance(n, ast.alias) and n.name.split(".")[0] in ("numpy", "pandas") for n in ast.walk(tree))


class _AugassignExpand(ast.NodeTransformer):
    def visit_AugAssign(self, node: ast.AugAssign) -> ast.AST:
        value = node.value
        number = isinstance(value, ast.Constant) and type(value.value) in (int, float)
        # `xs *= 2` repeats a list in place; with a number added, a list target fails either way
        if not isinstance(node.target, ast.Name) or not number or isinstance(node.op, ast.Mult):
            return node
        current = ast.Name(node.target.id, ast.Load())
        return ast.Assign(targets=[ast.Name(node.target.id, ast.Store())], value=ast.BinOp(current, node.op, value))


def augassign_expand(tree: ast.Module) -> None:
    if not _uses_arrays(tree):
        _AugassignExpand().visit(tree)


def _ternary(node: ast.If) -> ast.stmt | None:
    """`if c: x = a else: x = b` as `x = a if c else b`, and the same with return."""
    if len(node.body) != 1 or len(node.orelse) != 1:
        return None
    then, other = node.body[0], node.orelse[0]
    if isinstance(then, ast.Return) and isinstance(other, ast.Return):
        none = ast.Constant(None)
        return ast.Return(ast.IfExp(node.test, then.value or none, other.value or none))
    if not (isinstance(then, ast.Assign) and isinstance(other, ast.Assign)):
        return None
    if len(then.targets) == len(other.targets) == 1 and isinstance(then.targets[0], ast.Name) \
            and isinstance(other.targets[0], ast.Name) and then.targets[0].id == other.targets[0].id:
        return ast.Assign(targets=then.targets, value=ast.IfExp(node.test, then.value, other.value))
    return None


def ifelse_to_ternary(tree: ast.Module) -> None:
    for block in list(_blocks(tree)):
        for i, stmt in enumerate(block):
            if isinstance(stmt, ast.If) and (made := _ternary(stmt)) is not None:
                block[i] = made


def _if_else(stmt: ast.stmt) -> ast.If | None:
    """`x = a if c else b` as an if/else statement, and the same with return."""
    if isinstance(stmt, ast.Return) and isinstance(stmt.value, ast.IfExp):
        test = stmt.value
        return ast.If(test.test, [ast.Return(test.body)], [ast.Return(test.orelse)])
    if isinstance(stmt, ast.Assign) and len(stmt.targets) == 1 and isinstance(stmt.value, ast.IfExp):
        test = stmt.value
        return ast.If(test.test, [ast.Assign(targets=stmt.targets, value=test.body)],
                      [ast.Assign(targets=stmt.targets, value=test.orelse)])
    return None


def ternary_to_ifelse(tree: ast.Module) -> None:
    for block in list(_blocks(tree)):
        for i, stmt in enumerate(block):
            if (made := _if_else(stmt)) is not None:
                block[i] = made


def _returns(stmts: list[ast.stmt]) -> bool:
    return any(isinstance(n, ast.Return) for s in stmts for n in [s, *_own_nodes(s)])


def _assigning(stmts: list[ast.stmt], into: str) -> list[ast.stmt] | None:
    """stmts with every return turned into `into = value`; None when a return sits where that is not possible
    (inside a loop, say) or the block can end without returning."""
    for i, stmt in enumerate(stmts):
        rest = stmts[i + 1:]
        if isinstance(stmt, ast.Return):
            return [*stmts[:i], ast.Assign(targets=[ast.Name(into, ast.Store())],
                                           value=stmt.value or ast.Constant(None))] if not rest else None
        if isinstance(stmt, ast.If) and _returns([stmt]):
            then = _assigning(stmt.body, into)
            other = _assigning(stmt.orelse if stmt.orelse else rest, into)
            if then is None or other is None or (stmt.orelse and rest):
                return None
            return [*stmts[:i], ast.If(stmt.test, then, other)]
        if _returns([stmt]):
            return None
    return None


def early_return_to_single(tree: ast.Module) -> None:
    """A function with several returns gets one: each branch sets `result`, which the last line returns."""
    taken = _bound_names(tree)
    for function in _functions(tree):
        own_returns = [n for n in _own_nodes(function) if isinstance(n, ast.Return)]
        generator = any(isinstance(n, ast.Yield | ast.YieldFrom) for n in _own_nodes(function))
        if len(own_returns) < MIN_RETURNS or generator:
            continue
        name = _fresh("result", set(taken))
        body = _assigning(function.body, name)
        if body is not None:
            taken.add(name)
            function.body = [*body, ast.Return(ast.Name(name, ast.Load()))]


def _extractable(value: ast.expr) -> bool:
    """An expression worth moving into a helper, and safe to move out of its function."""
    if isinstance(value, ast.Name | ast.Constant):
        return False
    for node in ast.walk(value):
        if isinstance(node, (*UNMOVABLE, *COMPREHENSIONS)):
            return False
        if isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id == "super":
            return False
        if isinstance(node, ast.Attribute) and node.attr.startswith("__") and not node.attr.endswith("__"):
            return False  # name mangling works only inside the class
    return True


def _top_level_functions(tree: ast.Module) -> Iterator[tuple[int, Function]]:
    """Module functions and the methods of module classes, with the index of the statement holding them."""
    for i, stmt in enumerate(tree.body):
        if isinstance(stmt, ast.FunctionDef | ast.AsyncFunctionDef):
            yield i, stmt
        elif isinstance(stmt, ast.ClassDef):
            yield from ((i, m) for m in stmt.body if isinstance(m, ast.FunctionDef | ast.AsyncFunctionDef))


def extract_helper(tree: ast.Module) -> None:
    """The first returned expression moves into a helper function that the return calls."""
    for index, function in _top_level_functions(tree):
        if any(isinstance(n, ast.Nonlocal | ast.Global) for n in _own_nodes(function)) or _unsafe(function):
            continue
        local = _params(function) | _locals(function)
        for ret in (n for n in _own_nodes(function) if isinstance(n, ast.Return)):
            # a recursive call through a helper doubles the frames per level, so deep recursion would fail
            if ret.value is None or not _extractable(ret.value) or function.name in _loads(ret.value):
                continue
            free = sorted(_loads(ret.value) & local)
            name = _fresh("helper", _bound_names(tree))
            args = ast.arguments(posonlyargs=[], args=[ast.arg(a) for a in free], vararg=None, kwonlyargs=[],
                                 kw_defaults=[], kwarg=None, defaults=[])
            helper = ast.FunctionDef(name, args, [ast.Return(ret.value)], [], None, type_params=[])
            ret.value = ast.Call(ast.Name(name, ast.Load()), [ast.Name(a, ast.Load()) for a in free], [])
            tree.body.insert(index, helper)
            return


def _is_docstring(stmt: ast.stmt) -> bool:
    return isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Constant) and isinstance(stmt.value.value, str)


def add_docstring(tree: ast.Module) -> None:
    for function in _functions(tree):
        if not _is_docstring(function.body[0]):
            function.body.insert(0, ast.Expr(ast.Constant(DOCSTRING)))


def add_debug_print(tree: ast.Module) -> None:
    if "print" in _bound_names_assigned(tree):
        return
    for function in _functions(tree):
        at = 1 if _is_docstring(function.body[0]) else 0
        function.body.insert(at, ast.Expr(ast.Call(ast.Name("print", ast.Load()), [ast.Constant("debug")], [])))


TRANSFORMS: dict[str, Callable[[ast.Module], None]] = {
    "rename-locals": rename_locals, "comprehension-to-loop": comprehension_to_loop,
    "loop-to-comprehension": loop_to_comprehension, "for-to-while": for_to_while,
    "fstring-to-concat": fstring_to_concat, "augassign-expand": augassign_expand,
    "ifelse-to-ternary": ifelse_to_ternary, "ternary-to-ifelse": ternary_to_ifelse,
    "early-return-to-single": early_return_to_single, "extract-helper": extract_helper,
    "add-docstring": add_docstring, "add-debug-print": add_debug_print,
}


def _compiles(code: str) -> bool:
    try:
        compile(code, "<rewrite>", "exec")
    except SyntaxError:
        return False
    return True


def _candidates(tree: ast.Module) -> Iterator[tuple[str, ast.Module]]:
    for name, transform in TRANSFORMS.items():
        changed = copy.deepcopy(tree)
        transform(changed)
        yield name, changed
        if name == "rename-locals":
            yield from _param_rewrites(tree)


def rewrites(code: str) -> list[Rewrite]:
    """Every transform that changes code, in a fixed order; rename-params gives one rewrite per parameter name."""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return []
    original = ast.unparse(tree)
    found = []
    for rewrite_id, changed in _candidates(tree):
        text = ast.unparse(ast.fix_missing_locations(changed))
        if text != original and _compiles(text):
            found.append(Rewrite(rewrite_id, rewrite_id.split(":")[0], text))
    return found
