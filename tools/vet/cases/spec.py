"""The `[cases]` declaration of a task, variant or boss stage: what the hidden cases feed the learner's code.

content/README.md documents the format. parse_decl() turns the TOML table into a typed CasesDecl, or raises a
DeclError that names the field and says how to fix it.
"""

import re
from collections.abc import Callable
from dataclasses import dataclass
from typing import cast, get_args

from ..adapter import Compare

MAX_ITEMS = 12  # inputs stay small, so a correct but slow answer never times out on them
MAX_TEXT = 20
DEFAULT_COUNT = 100
MAX_COUNT = 2000
DEFAULT_STEPS = (1, 6)


class DeclError(ValueError):
    """A [cases] table the generator cannot use; the message names the field."""


@dataclass(frozen=True)
class IntT:
    lo: int
    hi: int


@dataclass(frozen=True)
class FloatT:
    lo: float
    hi: float


@dataclass(frozen=True)
class BoolT:
    pass


@dataclass(frozen=True)
class StrT:
    """ASCII letters and spaces, length lo..hi."""

    lo: int
    hi: int


@dataclass(frozen=True)
class WordT:
    pass


@dataclass(frozen=True)
class ChoiceT:
    options: tuple[str, ...]


@dataclass(frozen=True)
class ListT:
    item: "TypeSpec"
    lo: int
    hi: int


@dataclass(frozen=True)
class SetT:
    item: "TypeSpec"
    lo: int
    hi: int


@dataclass(frozen=True)
class TupleT:
    items: tuple["TypeSpec", ...]


@dataclass(frozen=True)
class DictT:
    key: "TypeSpec"
    value: "TypeSpec"
    lo: int
    hi: int


@dataclass(frozen=True)
class OptionalT:
    item: "TypeSpec"


@dataclass(frozen=True)
class ArrayT:
    item: "TypeSpec"
    lo: int
    hi: int


@dataclass(frozen=True)
class MatrixT:
    item: "TypeSpec"
    rows: tuple[int, int]
    cols: tuple[int, int]


@dataclass(frozen=True)
class FrameT:
    columns: tuple[tuple[str, "TypeSpec"], ...]
    lo: int
    hi: int


TypeSpec = (IntT | FloatT | BoolT | StrT | WordT | ChoiceT | ListT | SetT | TupleT | DictT | OptionalT | ArrayT
            | MatrixT | FrameT)
Scalar = IntT | FloatT | BoolT | StrT | WordT | ChoiceT
SCALARS = (IntT, FloatT, BoolT, StrT, WordT, ChoiceT)


@dataclass(frozen=True)
class CallShape:
    call: str
    args: tuple[TypeSpec, ...]


@dataclass(frozen=True)
class ObjectShape:
    cls: str
    init: tuple[TypeSpec, ...]
    methods: tuple[tuple[str, tuple[TypeSpec, ...]], ...]
    reads: tuple[str, ...]
    steps: tuple[int, int]


@dataclass(frozen=True)
class ProgramShape:
    stdin: tuple[Scalar, ...]


@dataclass(frozen=True)
class NoCases:
    reason: str


Shape = CallShape | ObjectShape | ProgramShape | NoCases


@dataclass(frozen=True)
class CasesDecl:
    shape: Shape
    compare: Compare = "exact"
    valid: str | None = None
    setup: str = ""
    mutates: tuple[int, ...] = ()
    raises: tuple[str, ...] = ()
    count: int = DEFAULT_COUNT


TYPE_HELP = ("write one of: int A..B, float A..B, bool, str A..B, word, choice a|b, list<T> A..B, set<T> A..B, "
             "tuple<T, U>, dict<K, V> A..B, optional<T>, array<T> A..B, matrix<T> R..R C..C, frame{col: T} A..B")
TOKEN = re.compile(r"\s*(-?\d+(?:\.\d+)?|\.\.|[A-Za-z_]\w*|[<>{},:|])")
NAME = re.compile(r"[A-Za-z_]\w*")
SHAPES = ("call", "class", "stdin", "none")
COMMON = {"compare", "valid", "setup", "mutates", "raises", "count"}
FIELDS = {"call": {"call", "args"} | COMMON, "class": {"class", "init", "methods", "reads", "steps"} | COMMON,
          "stdin": {"stdin"} | COMMON, "none": {"none"}}


class _Tokens:
    def __init__(self, text: str) -> None:
        self.text = text
        self.items: list[str] = []
        pos = 0
        while pos < len(text.rstrip()):
            match = TOKEN.match(text, pos)
            if not match:
                raise DeclError(f"cannot read {text[pos:]!r}; {TYPE_HELP}")
            self.items.append(match.group(1))
            pos = match.end()
        self.at = 0

    def peek(self) -> str | None:
        return self.items[self.at] if self.at < len(self.items) else None

    def take(self, expected: str | None = None) -> str:
        token = self.peek()
        if token is None or (expected is not None and token != expected):
            raise DeclError(f"expected {expected or 'more'} in {self.text!r}; {TYPE_HELP}")
        self.at += 1
        return token

    def number(self) -> float:
        token = self.take()
        try:
            return float(token)
        except ValueError:
            raise DeclError(f"expected a number, found {token!r} in {self.text!r}") from None

    def span(self, default: tuple[float, float] | None = None) -> tuple[float, float]:
        """A..B, or the default when the type leaves it out."""
        if default is not None and not _is_number(self.peek()):
            return default
        lo = self.number()
        self.take("..")
        hi = self.number()
        if lo > hi:
            raise DeclError(f"range {lo:g}..{hi:g} is empty in {self.text!r}")
        return lo, hi


def _is_number(token: str | None) -> bool:
    return token is not None and re.fullmatch(r"-?\d+(?:\.\d+)?", token) is not None


def _size(tokens: _Tokens, cap: int, default: bool = True) -> tuple[int, int]:
    lo, hi = tokens.span((0, cap) if default else None)
    if lo < 0 or lo != int(lo) or hi != int(hi):
        raise DeclError(f"sizes are whole numbers from 0 in {tokens.text!r}")
    if hi > cap:
        raise DeclError(f"keep inputs small: at most {cap} in {tokens.text!r}")
    return int(lo), int(hi)


def _inner(tokens: _Tokens) -> TypeSpec:
    tokens.take("<")
    item = _type(tokens)
    tokens.take(">")
    return item


def _scalar(tokens: _Tokens, item: TypeSpec) -> Scalar:
    if not isinstance(item, SCALARS):
        raise DeclError(f"set items, dict keys, frame columns and input lines must be simple values in "
                        f"{tokens.text!r}")
    return item


def _number(tokens: _Tokens, item: TypeSpec) -> TypeSpec:
    if not isinstance(item, IntT | FloatT):
        raise DeclError(f"array and matrix items must be int or float in {tokens.text!r}")
    return item


def _int_range(tokens: _Tokens) -> IntT:
    lo, hi = tokens.span()
    if lo != int(lo) or hi != int(hi):
        raise DeclError(f"int bounds must be whole numbers in {tokens.text!r}")
    return IntT(int(lo), int(hi))


def _choice(tokens: _Tokens) -> ChoiceT:
    options = [tokens.take()]
    while tokens.peek() == "|":
        tokens.take("|")
        options.append(tokens.take())
    return ChoiceT(tuple(options))


def _tuple(tokens: _Tokens) -> TupleT:
    tokens.take("<")
    items = [_type(tokens)]
    while tokens.peek() == ",":
        tokens.take(",")
        items.append(_type(tokens))
    tokens.take(">")
    return TupleT(tuple(items))


def _dict(tokens: _Tokens) -> DictT:
    tokens.take("<")
    key = _scalar(tokens, _type(tokens))
    tokens.take(",")
    value = _type(tokens)
    tokens.take(">")
    return DictT(key, value, *_size(tokens, MAX_ITEMS))


def _frame(tokens: _Tokens) -> FrameT:
    tokens.take("{")
    columns: list[tuple[str, TypeSpec]] = []
    while True:
        name = tokens.take()
        tokens.take(":")
        columns.append((name, _scalar(tokens, _type(tokens))))
        if tokens.peek() != ",":
            break
        tokens.take(",")
    tokens.take("}")
    return FrameT(tuple(columns), *_size(tokens, MAX_ITEMS))


def _list(tokens: _Tokens) -> ListT:
    item = _inner(tokens)
    return ListT(item, *_size(tokens, MAX_ITEMS))


def _set(tokens: _Tokens) -> SetT:
    item = _scalar(tokens, _inner(tokens))
    return SetT(item, *_size(tokens, MAX_ITEMS))


def _array(tokens: _Tokens) -> ArrayT:
    item = _number(tokens, _inner(tokens))
    return ArrayT(item, *_size(tokens, MAX_ITEMS))


def _matrix(tokens: _Tokens) -> MatrixT:
    item = _number(tokens, _inner(tokens))
    return MatrixT(item, _size(tokens, MAX_ITEMS, default=False), _size(tokens, MAX_ITEMS, default=False))


PARSERS: dict[str, Callable[[_Tokens], TypeSpec]] = {
    "int": _int_range,
    "float": lambda tokens: FloatT(*tokens.span()),
    "bool": lambda _: BoolT(),
    "str": lambda tokens: StrT(*_size(tokens, MAX_TEXT)),
    "word": lambda _: WordT(),
    "choice": _choice,
    "list": _list,
    "set": _set,
    "array": _array,
    "matrix": _matrix,
    "tuple": _tuple,
    "dict": _dict,
    "optional": lambda tokens: OptionalT(_inner(tokens)),
    "frame": _frame,
}


def _type(tokens: _Tokens) -> TypeSpec:
    name = tokens.take()
    if name not in PARSERS:
        raise DeclError(f"unknown type {name!r}; {TYPE_HELP}")
    return PARSERS[name](tokens)


def parse_type(text: str) -> TypeSpec:
    tokens = _Tokens(text)
    spec = _type(tokens)
    if tokens.peek() is not None:
        raise DeclError(f"unexpected {tokens.peek()!r} in {text!r}; {TYPE_HELP}")
    return spec


class _Table:
    """Reads one [cases] table; every error starts with the field it is about."""

    def __init__(self, table: dict[str, object], where: str) -> None:
        self.table = table
        self.where = f"{where} [cases]"

    def fail(self, field: str, message: str) -> DeclError:
        return DeclError(f"{self.where} {field}: {message}" if field else f"{self.where}: {message}")

    def name(self, field: str) -> str:
        value = self.table.get(field)
        if not isinstance(value, str) or not NAME.fullmatch(value):
            raise self.fail(field, "must be a Python name in quotes")
        return value

    def names(self, field: str) -> tuple[str, ...]:
        value = self.table.get(field, [])
        if not isinstance(value, list) or not all(isinstance(v, str) and NAME.fullmatch(v) for v in value):
            raise self.fail(field, 'must be a list of Python names, like ["balance"]')
        return tuple(cast(list[str], value))

    def types(self, field: str, value: object) -> tuple[TypeSpec, ...]:
        if not isinstance(value, list) or not all(isinstance(v, str) for v in value):
            raise self.fail(field, 'must be a list of types in quotes, like ["int 0..9"]')
        specs = []
        for i, text in enumerate(cast(list[str], value)):
            try:
                specs.append(parse_type(text))
            except DeclError as e:
                raise self.fail(f"{field}[{i}]", str(e)) from None
        return tuple(specs)

    def span(self, field: str, default: tuple[int, int]) -> tuple[int, int]:
        value = self.table.get(field)
        if value is None:
            return default
        match = re.fullmatch(r"(\d+)\.\.(\d+)", value) if isinstance(value, str) else None
        if not match or int(match.group(1)) > int(match.group(2)):
            raise self.fail(field, 'must be a range in quotes, like "2..6"')
        return int(match.group(1)), int(match.group(2))


def _shape(t: _Table, kind: str) -> Shape:
    table = t.table
    match kind:
        case "none":
            reason = table["none"]
            if not isinstance(reason, str) or not reason.strip():
                raise t.fail("none", "must say why this item has no hidden cases")
            return NoCases(reason)
        case "call":
            return CallShape(t.name("call"), t.types("args", table.get("args", [])))
        case "class":
            methods = table.get("methods")
            if not isinstance(methods, dict) or not methods:
                raise t.fail("methods", 'must name at least one method, like { deposit = ["int 1..200"] }')
            calls = tuple((name, t.types(f"methods.{name}", args)) for name, args in sorted(methods.items()))
            return ObjectShape(t.name("class"), t.types("init", table.get("init", [])), calls, t.names("reads"),
                               t.span("steps", DEFAULT_STEPS))
    lines = t.types("stdin", table["stdin"])
    for i, spec in enumerate(lines):
        if not isinstance(spec, SCALARS):
            raise t.fail(f"stdin[{i}]", "each typed line must be a simple value (int, float, bool, str, word, choice)")
    return ProgramShape(cast(tuple[Scalar, ...], lines))


def _mutates(t: _Table, shape: Shape) -> tuple[int, ...]:
    value = t.table.get("mutates", [])
    arity = len(shape.args) if isinstance(shape, CallShape) else 0
    if not isinstance(value, list) or not all(isinstance(i, int) and 0 <= i < arity for i in value):
        raise t.fail("mutates", f"must list argument positions of the call, from 0 to {arity - 1}")
    return tuple(cast(list[int], value))


def _options(t: _Table, shape: Shape) -> CasesDecl:
    table = t.table
    compare = table.get("compare", "text" if isinstance(shape, ProgramShape) else "exact")
    if compare not in get_args(Compare):
        raise t.fail("compare", f"must be one of {', '.join(get_args(Compare))}")
    setup = table.get("setup", "")
    if not isinstance(setup, str):
        raise t.fail("setup", "must be import lines in quotes")
    count = table.get("count", DEFAULT_COUNT)
    if not isinstance(count, int) or not 1 <= count <= MAX_COUNT:
        raise t.fail("count", f"must be a whole number from 1 to {MAX_COUNT}")
    valid = t.name("valid") if "valid" in table else None
    if valid and isinstance(shape, ObjectShape):
        raise t.fail("valid", "works for a call or a program, not a class")
    return CasesDecl(shape, cast(Compare, "valid" if valid else compare), valid, setup, _mutates(t, shape),
                     t.names("raises"), count)


def parse_decl(table: dict[str, object], where: str) -> CasesDecl:
    t = _Table(table, where)
    kinds = [k for k in SHAPES if k in table]
    if len(kinds) != 1:
        raise t.fail("", "needs exactly one of call, class, stdin or none")
    [kind] = kinds
    unknown = sorted(table.keys() - FIELDS[kind])
    if unknown:
        raise t.fail(unknown[0], f"is not a field for a {kind} declaration")
    shape = _shape(t, kind)
    return CasesDecl(shape) if isinstance(shape, NoCases) else _options(t, shape)
