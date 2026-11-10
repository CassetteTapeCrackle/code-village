"""generate_inputs(): small, readable inputs for a [cases] declaration, edge cases first, the same for a seed."""

import string
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from random import Random

from ..adapter import CaseInput, ExprInput, ProgramInput
from .spec import (
    ArrayT,
    BoolT,
    CallShape,
    CasesDecl,
    ChoiceT,
    DictT,
    FloatT,
    FrameT,
    IntT,
    ListT,
    MatrixT,
    NoCases,
    ObjectShape,
    OptionalT,
    ProgramShape,
    Scalar,
    SetT,
    Shape,
    StrT,
    TupleT,
    TypeSpec,
    WordT,
)

WORDS = ("cat", "dog", "sun", "tree", "milk", "blue", "rain", "book", "fish", "star", "road", "lamp", "pear",
         "wind", "door", "frog")
TEXT_CHARS = string.ascii_letters + "  "
COIN = 0.5
NONE_SHARE = 0.2  # optional<T> gives None one time in five
ATTEMPTS_PER_INPUT = 20  # small input spaces (a bool, a choice) run out of new inputs long before count


@dataclass(frozen=True)
class SetV:
    items: tuple["Value", ...]


@dataclass(frozen=True)
class ArrayV:
    items: list["Value"]


@dataclass(frozen=True)
class FrameV:
    columns: tuple[tuple[str, list["Value"]], ...]


Value = (int | float | bool | str | None | list["Value"] | tuple["Value", ...] | dict["Value", "Value"] | SetV
         | ArrayV | FrameV)


def source(value: Value) -> str:
    """Python source that evaluates to the value, written the way a learner would."""
    if isinstance(value, list | tuple | dict):
        return _builtin_source(value)
    if isinstance(value, SetV):
        return "{" + ", ".join(source(v) for v in value.items) + "}" if value.items else "set()"
    if isinstance(value, ArrayV):
        return f"np.array({source(value.items)})"
    if isinstance(value, FrameV):
        return "pd.DataFrame({" + ", ".join(f"{name!r}: {source(col)}" for name, col in value.columns) + "})"
    return repr(value)


def _builtin_source(value: list[Value] | tuple[Value, ...] | dict[Value, Value]) -> str:
    if isinstance(value, dict):
        return "{" + ", ".join(f"{source(k)}: {source(v)}" for k, v in value.items()) + "}"
    inside = ", ".join(source(v) for v in value)
    if isinstance(value, list):
        return f"[{inside}]"
    return f"({inside},)" if len(value) == 1 else f"({inside})"


def _unique(values: list[Value]) -> list[Value]:
    seen: dict[str, Value] = {}
    for value in values:
        seen.setdefault(source(value), value)
    return list(seen.values())


def _sizes(lo: int, hi: int) -> list[int]:
    """The edge sizes: the smallest allowed, then one item and two (a duplicate) when allowed."""
    return list(dict.fromkeys(n for n in (lo, 1, 2) if lo <= n <= hi))


def _numbers(lo: float, hi: float, whole: bool) -> list[Value]:
    zero_one: tuple[Value, ...] = (0, 1, -1) if whole else (0.0,)
    bounds: list[Value] = [int(lo), int(hi)] if whole else [float(lo), float(hi)]
    return _unique(bounds + [x for x in zero_one if isinstance(x, int | float) and lo <= x <= hi])


def _distinct(item: TypeSpec, n: int) -> list[Value] | None:
    """n different edge values of item, or None when it has fewer."""
    found = _unique(edges(item))
    return found[:n] if len(found) >= n else None


def _scalar_edges(spec: Scalar) -> list[Value]:
    match spec:
        case IntT(lo, hi):
            return _numbers(lo, hi, whole=True)
        case FloatT(lo, hi):
            return _numbers(lo, hi, whole=False)
        case BoolT():
            return [False, True]
        case StrT(lo, hi):
            return _unique(["a" * lo, "a" * hi])
        case WordT():
            return [WORDS[0]]
        case ChoiceT(options):
            return list(options)


def _collection_edges(spec: ListT | ArrayT | SetT | DictT) -> list[Value]:
    match spec:
        case ListT(item, lo, hi):
            first = edges(item)[0]
            return [[first] * n for n in _sizes(lo, hi)]
        case ArrayT(item, lo, hi):
            first = edges(item)[0]
            return [ArrayV([first] * n) for n in _sizes(lo, hi)]
        case SetT(item, lo, hi):
            return [SetV(tuple(found)) for n in _sizes(lo, hi) if (found := _distinct(item, n)) is not None]
        case DictT(key, value, lo, hi):
            value_edge = edges(value)[0]
            return [{k: value_edge for k in keys} for n in _sizes(lo, hi)
                    if (keys := _distinct(key, n)) is not None]


def _shaped_edges(spec: TupleT | OptionalT | MatrixT | FrameT) -> list[Value]:
    match spec:
        case TupleT(items):
            columns = [edges(item) for item in items]
            return [tuple(col[i % len(col)] for col in columns) for i in range(max(map(len, columns)))]
        case OptionalT(item):
            return [None, *edges(item)]
        case MatrixT(item, (rows, _), (cols, _)):
            first = edges(item)[0]
            return [ArrayV([[first] * cols for _ in range(rows)])]
        case FrameT(columns, lo, hi):
            return [FrameV(tuple((name, [edges(t)[0]] * n) for name, t in columns)) for n in _sizes(lo, hi)]


def edges(spec: TypeSpec) -> list[Value]:
    """The values most likely to break code: bounds, zero, empty, one item, duplicates."""
    if isinstance(spec, ListT | ArrayT | SetT | DictT):
        return _collection_edges(spec)
    if isinstance(spec, TupleT | OptionalT | MatrixT | FrameT):
        return _shaped_edges(spec)
    return _scalar_edges(spec)


def _text(rng: Random, lo: int, hi: int) -> str:
    return "".join(rng.choice(TEXT_CHARS) for _ in range(rng.randint(lo, hi)))


def _sample_scalar(spec: Scalar, rng: Random) -> Value:
    match spec:
        case IntT(lo, hi):
            return rng.randint(lo, hi)
        case FloatT(lo, hi):
            return min(max(round(rng.uniform(lo, hi), 2), lo), hi)
        case BoolT():
            return rng.random() < COIN
        case StrT(lo, hi):
            return _text(rng, lo, hi)
        case WordT():
            return rng.choice(WORDS)
        case ChoiceT(options):
            return rng.choice(options)


def _distinct_sample(item: TypeSpec, rng: Random, n: int) -> list[Value]:
    """Up to n different values; fewer when the item has fewer (a set of bool)."""
    found: dict[str, Value] = {}
    for _ in range(n * ATTEMPTS_PER_INPUT):
        if len(found) == n:
            break
        value = sample(item, rng)
        found.setdefault(source(value), value)
    return list(found.values())


def _sample_collection(spec: ListT | ArrayT | SetT | DictT, rng: Random) -> Value:
    match spec:
        case ListT(item, lo, hi):
            return [sample(item, rng) for _ in range(rng.randint(lo, hi))]
        case ArrayT(item, lo, hi):
            return ArrayV([sample(item, rng) for _ in range(rng.randint(lo, hi))])
        case SetT(item, lo, hi):
            return SetV(tuple(_distinct_sample(item, rng, rng.randint(lo, hi))))
        case DictT(key, value, lo, hi):
            return {k: sample(value, rng) for k in _distinct_sample(key, rng, rng.randint(lo, hi))}


def _sample_shaped(spec: TupleT | OptionalT | MatrixT | FrameT, rng: Random) -> Value:
    match spec:
        case TupleT(items):
            return tuple(sample(item, rng) for item in items)
        case OptionalT(item):
            return None if rng.random() < NONE_SHARE else sample(item, rng)
        case MatrixT(item, rows, cols):
            width = rng.randint(*cols)
            return ArrayV([[sample(item, rng) for _ in range(width)] for _ in range(rng.randint(*rows))])
        case FrameT(columns, lo, hi):
            n = rng.randint(lo, hi)
            return FrameV(tuple((name, [sample(t, rng) for _ in range(n)]) for name, t in columns))


def sample(spec: TypeSpec, rng: Random) -> Value:
    if isinstance(spec, ListT | ArrayT | SetT | DictT):
        return _sample_collection(spec, rng)
    if isinstance(spec, TupleT | OptionalT | MatrixT | FrameT):
        return _sample_shaped(spec, rng)
    return _sample_scalar(spec, rng)


Pick = Callable[[TypeSpec], Value]


def _picker(rng: Random, edge: int | None) -> Pick:
    """Edge row i takes the i-th edge of every argument (so equal types tie); a random row samples."""
    def pick(spec: TypeSpec) -> Value:
        found = edges(spec) if edge is not None else []
        return found[edge % len(found)] if edge is not None and found else sample(spec, rng)
    return pick


def _walk(spec: TypeSpec) -> Iterator[TypeSpec]:
    yield spec
    match spec:
        case ListT(item) | SetT(item) | OptionalT(item) | ArrayT(item) | MatrixT(item):
            yield from _walk(item)
        case DictT(key, value):
            yield from _walk(key)
            yield from _walk(value)
        case TupleT(items):
            for item in items:
                yield from _walk(item)
        case FrameT(columns):
            for _, item in columns:
                yield from _walk(item)


def _arg_specs(shape: Shape) -> list[TypeSpec]:
    match shape:
        case CallShape(_, args):
            return list(args)
        case ObjectShape(_, init, methods):
            return [*init, *(spec for _, args in methods for spec in args)]
        case ProgramShape(stdin):
            return list(stdin)
    return []


def _setup(decl: CasesDecl) -> list[str]:
    """The declared setup lines plus the imports that array and frame inputs need."""
    lines = [line for line in decl.setup.splitlines() if line.strip()]
    kinds = {type(t) for spec in _arg_specs(decl.shape) for t in _walk(spec)}
    needed = (["import numpy as np"] if kinds & {ArrayT, MatrixT} else []) + \
        (["import pandas as pd"] if FrameT in kinds else [])
    return lines + [line for line in needed if line not in lines]


def _call_input(shape: CallShape, decl: CasesDecl, setup: list[str], pick: Pick) -> CaseInput:
    args = [source(pick(spec)) for spec in shape.args]
    show = f"{shape.call}({', '.join(args)})"
    if not decl.mutates:
        return ExprInput(show, "\n".join(setup), show)
    # a mutated argument is bound to a name first, so the case can read it again after the call
    names = [f"_arg{i}" if i in decl.mutates else arg for i, arg in enumerate(args)]
    binds = [f"_arg{i} = {args[i]}" for i in decl.mutates]
    expr = f"({shape.call}({', '.join(names)}), {', '.join(f'_arg{i}' for i in decl.mutates)})"
    return ExprInput(show, "\n".join(setup + binds), expr)


def _object_input(shape: ObjectShape, setup: list[str], pick: Pick, rng: Random, edge: int | None) -> CaseInput:
    init = f"obj = {shape.cls}({', '.join(source(pick(spec)) for spec in shape.init)})"
    steps = shape.steps[0] if edge is not None else rng.randint(*shape.steps)
    calls = []
    for step in range(steps):
        name, specs = shape.methods[(edge + step) % len(shape.methods)] if edge is not None \
            else rng.choice(shape.methods)
        calls.append(f"obj.{name}({', '.join(source(pick(spec)) for spec in specs)})")
    reads = [f"obj.{name}" for name in shape.reads]
    return ExprInput("; ".join([init, *calls, *reads]), "\n".join([*setup, init]), f"[{', '.join(calls + reads)}]")


def _shown_line(line: str) -> str:
    return line if line and line.strip() == line and " " not in line else repr(line)


def _program_input(shape: ProgramShape, pick: Pick) -> CaseInput:
    lines = tuple(str(pick(spec)) for spec in shape.stdin)
    return ProgramInput("typing " + " then ".join(_shown_line(line) for line in lines), lines)


def _one_input(decl: CasesDecl, setup: list[str], rng: Random, edge: int | None) -> CaseInput:
    pick = _picker(rng, edge)
    match decl.shape:
        case CallShape():
            return _call_input(decl.shape, decl, setup, pick)
        case ObjectShape():
            return _object_input(decl.shape, setup, pick, rng, edge)
    assert isinstance(decl.shape, ProgramShape)
    return _program_input(decl.shape, pick)


def generate_inputs(decl: CasesDecl, seed: str, count: int) -> list[CaseInput]:
    """count different inputs: edge cases first, then random ones from smallest to largest."""
    if isinstance(decl.shape, NoCases):
        return []
    rng = Random(seed)
    setup = _setup(decl)
    edge_rows = max((len(edges(spec)) for spec in _arg_specs(decl.shape)), default=1)
    found: dict[CaseInput, None] = {}
    for row in range(min(edge_rows, count)):
        found.setdefault(_one_input(decl, setup, rng, row))
    first = list(found)
    for _ in range(count * ATTEMPTS_PER_INPUT):
        if len(found) >= count:
            break
        found.setdefault(_one_input(decl, setup, rng, None))
    rest = sorted(list(found)[len(first):], key=lambda case: len(case.show))
    return first + rest
