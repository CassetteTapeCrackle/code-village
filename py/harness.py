"""Run a learner's code, alone or against a task's tests.

The same file runs in CPython (tools/content_check.py, at build time) and in Pyodide (the browser),
so a task that passes the build passes in the browser. Messages are written for learners.
"""

import ast
import builtins
import contextlib
import functools
import importlib
import io
import json
import math
import os
import shutil
import sys
import tempfile
import traceback
from collections.abc import Callable, Collection, Iterable, Iterator, Mapping, Sequence
from typing import NotRequired, TypedDict, TypeGuard, cast

MAX_OUTPUT = 10_000
LEARNER_FILE = "your_code.py"
HEAVY_LIBRARIES = {"numpy", "pandas", "sklearn", "scipy"}
NO_INPUT = "input() was called, but this task gives no input"
TOO_MANY_INPUTS = "input() was called more times than this test gives answers"
SHOWN_LENGTH = 80  # a value in a hidden-case message is cut to this many characters
REL_TOL = ABS_TOL = 1e-9
# the syntax a feature can be named after (node:<class>); any other node class is plain Python everywhere
TRACKED_NODES = frozenset({
    "For", "While", "Break", "Continue", "If", "IfExp", "Match", "FunctionDef", "Return", "Lambda", "ClassDef",
    "Try", "Raise", "Assert", "With", "Global", "Nonlocal", "Yield", "YieldFrom", "Starred", "ListComp", "SetComp",
    "DictComp", "GeneratorExp", "JoinedStr", "AugAssign", "Slice", "Delete", "NamedExpr",
})
BUILTIN_NAMES = frozenset(name for name in dir(builtins) if not name.startswith("_"))
KWARG_PREFIX = "kwarg:"  # a keyword argument names a construct only when the vocabulary lists it


class RunResult(TypedDict):
    stdout: str
    error: str | None


class TestResult(TypedDict):
    name: str
    passed: bool
    message: str
    hidden: bool


class CheckResult(TypedDict):
    error: str | None
    results: list[TestResult]


class ExprInput(TypedDict):
    """A generated input: run `setup`, then evaluate `expr`; `show` is what the learner reads."""

    show: str
    setup: str
    expr: str


class ProgramInput(TypedDict):
    """A generated input for a whole program: one line per input() call."""

    show: str
    stdin: list[str]


CaseInput = ExprInput | ProgramInput


class ExprCase(ExprInput):
    """A hidden case. `expect` is Python source for the expected value; with compare "valid" it is the
    input instead, which the tests.py function named by `valid` judges together with the answer."""

    expect: str
    raises: str | None
    compare: str
    valid: NotRequired[str]


class ProgramCase(ProgramInput):
    expect: str
    compare: str
    valid: NotRequired[str]


Case = ExprCase | ProgramCase


class ExpectedValue(TypedDict):
    """repr is Python source that evaluates back to the answer; None when the answer has no such source."""

    repr: str | None
    raises: str | None


class ExpectResult(TypedDict):
    values: list[ExpectedValue]


class Required(TypedDict):
    """A construct a task asks for: the feature id, its detectors and what to tell the learner to do."""

    id: str
    detect: list[str]
    say: str


class FeatureQuery(TypedDict):
    code: str
    own_names: NotRequired[list[str]]


class FeaturesResult(TypedDict):
    features: list[list[str]]


class Failure(Exception):
    """A test's own failure, with a message meant for the learner."""


class _CappedOutput(io.StringIO):
    def write(self, s: str) -> int:
        room = MAX_OUTPUT - self.tell()
        if room <= 0:
            return len(s)
        if len(s) > room:
            super().write(s[:room] + "\n(output cut)\n")
            return len(s)
        return super().write(s)


@contextlib.contextmanager
def _fake_input(answers: Iterable[str], message: str, echo: bool = False) -> Iterator[None]:
    """echo=True prints prompt and answer like a terminal (Run); checks leave prompts out of the output,
    so `input("Name: ")` passes the same tests as `input()`."""
    feed = iter(answers)
    original = builtins.input

    def fake(prompt: object = "") -> str:
        try:
            answer = next(feed)
        except StopIteration:
            if echo:
                print(prompt)
            raise Failure(message) from None
        if echo:
            print(f"{prompt}{answer}")
        return answer

    builtins.input = fake
    try:
        yield
    finally:
        builtins.input = original


def _learner_error(error: BaseException) -> str:
    """The error as the learner should see it: only frames from their own file."""
    if isinstance(error, Failure):
        return str(error)
    if isinstance(error, SyntaxError):
        return f"SyntaxError on line {error.lineno}: {error.msg}"
    tb = traceback.TracebackException.from_exception(error)
    tb.stack = traceback.StackSummary.from_list([f for f in tb.stack if f.filename == LEARNER_FILE])
    return "".join(tb.format()).strip()


@contextlib.contextmanager
def _fresh_dir() -> Iterator[None]:
    """Every job starts in an empty folder, so files one run writes never reach the next (or the repo)."""
    home = os.getcwd()
    folder = tempfile.mkdtemp(prefix="job-")
    os.chdir(folder)
    try:
        yield
    finally:
        os.chdir(home)
        shutil.rmtree(folder, ignore_errors=True)


def heavy_imports(source: str) -> list[str]:
    """The big-library modules this code imports, so they can load before the timed run starts."""
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return []
    found: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names = [a.name for a in node.names]
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            names = [node.module] + [f"{node.module}.{a.name}" for a in node.names]  # `from sklearn import neighbors`
        else:
            continue
        found += [n for n in names if n.split(".")[0] in HEAVY_LIBRARIES and n not in found]
    return found


def preimport(modules: Iterable[str]) -> None:
    for name in modules:
        # not a module (a class), or a typo the timed run will report
        with contextlib.suppress(Exception):
            importlib.import_module(name)


def _execute(code: str, namespace: dict[str, object]) -> None:
    exec(compile(code, LEARNER_FILE, "exec"), namespace)


def run_code(code: str, inputs: Sequence[str]) -> RunResult:
    out = _CappedOutput()
    error = None
    waiting = "input() is waiting for an answer: type it in the input box, one line per input()"
    with _fresh_dir(), contextlib.redirect_stdout(out), _fake_input(inputs, waiting, echo=True):
        try:
            _execute(code, {"__name__": "__main__"})
        except BaseException as e:  # every learner error is reported, never raised
            error = _learner_error(e)
    return {"stdout": out.getvalue(), "error": error}


# The punctuation beginners are allowed to get wrong: only a dot or comma between two digits is kept.
_IGNORED_PUNCTUATION = ",.!?;:'\""


def _lenient_text(text: str) -> str:
    text = " ".join(text.casefold().split())
    kept = []
    for i, char in enumerate(text):
        if char in _IGNORED_PUNCTUATION:
            if char in ".," and 0 < i < len(text) - 1 and text[i - 1].isdigit() and text[i + 1].isdigit():
                kept.append(char)
            continue
        kept.append(char)
    return "".join(kept)


def _forgiving(value: object) -> object:
    """What a str, or a container of str, compares as when the task does not teach exact formatting."""
    if isinstance(value, str):
        return _lenient_text(value)
    if isinstance(value, list):
        return [_forgiving(item) for item in value]
    if isinstance(value, tuple):
        return tuple(_forgiving(item) for item in value)
    if isinstance(value, dict):
        return {_forgiving(key): _forgiving(item) for key, item in value.items()}
    return value


def _first_difference(actual: str, expected: str) -> int:
    for i, (a, e) in enumerate(zip(actual, expected, strict=False)):
        if a != e:
            return i
    return min(len(actual), len(expected))


def _mismatch(actual: object, expected: object, call: str) -> str:
    shown_actual, shown_expected = repr(actual), repr(expected)
    if call:
        head = f"{call} returned {shown_actual}, expected {shown_expected}"
        start = len(f"{call} returned {shown_actual}, expected ")
    else:
        head = f"expected {shown_expected}, got {shown_actual}"
        start = len("expected ")
    caret = " " * (start + _first_difference(shown_actual, shown_expected)) + "^"
    return f"{head}\n{caret}"


def expect_equal(actual: object, expected: object, call: str = "", *, strict: bool = False) -> None:
    same = actual == expected if strict else _forgiving(actual) == _forgiving(expected)
    if not same:
        raise Failure(_mismatch(actual, expected, call))


class _Learner(dict[str, object]):
    """The learner's names, as tests see them; a missing name is a readable failure."""

    def __missing__(self, name: str) -> object:
        raise Failure(f"{name} is not defined in your code")


def run_tests(code: str, tests: str, strict: bool = False, cases: Sequence[Case] = (),
              requires: Sequence[Required] = ()) -> CheckResult:
    """The visible tests, then the hidden cases (even when a visible test failed: a learner whose code passes
    every hidden case but fails a visible test is how a too strict test shows itself). Then, only when all of that
    passed, the constructs the task requires."""
    with _fresh_dir():
        out = _run_tests(code, tests, strict, cases)
    if requires and not out["error"] and all(r["passed"] for r in out["results"]):
        missing = _missing_construct(code, requires)
        if missing:
            out["results"].append(missing)
    return out


def _missing_construct(code: str, requires: Sequence[Required]) -> TestResult | None:
    """A failing result for the first required construct the code does not use, None when it uses them all."""
    for need in requires:
        if need["id"] not in detect_features(code, {need["id"]: need["detect"]}):
            return {"name": "Uses what the task asks", "passed": False, "hidden": False,
                    "message": f"Your code works, but this task asks you to {need['say']}."}
    return None


def _test_label(name: str, fn: Callable[[], object]) -> str:
    if fn.__doc__:
        return fn.__doc__.strip().splitlines()[0]
    return name.removeprefix("test_").replace("_", " ")


def _run_one_test(label: str, fn: Callable[[], object]) -> TestResult:
    try:
        with contextlib.redirect_stdout(_CappedOutput()), _fake_input([], NO_INPUT):
            fn()
    except Failure as f:
        return {"name": label, "passed": False, "message": str(f), "hidden": False}
    except AssertionError as a:
        return {"name": label, "passed": False, "message": str(a) or "a check did not hold", "hidden": False}
    except Exception as e:  # a learner bug inside a test is a failed test, not a crash
        return {"name": label, "passed": False, "message": f"your code raised {type(e).__name__}: {e}",
                "hidden": False}
    return {"name": label, "passed": True, "message": "", "hidden": False}


def _run_tests(code: str, tests: str, strict: bool, cases: Sequence[Case]) -> CheckResult:
    """Tests that set PROGRAM = True run the whole program with run_program(inputs) instead of
    importing the learner's functions, so top-level input() is allowed there and nowhere else."""
    learner = _Learner()

    def run_program(inputs: Iterable[str] = ()) -> str:
        out = _CappedOutput()
        with contextlib.redirect_stdout(out), _fake_input(list(inputs), TOO_MANY_INPUTS):
            _execute(code, {"__name__": "__main__"})
        return out.getvalue()

    scope: dict[str, object] = {
        "learner": learner,
        "expect_equal": functools.partial(expect_equal, strict=strict),
        "run_program": run_program,
        "Failure": Failure,
    }
    exec(compile(tests, "tests.py", "exec"), scope)
    if not scope.get("PROGRAM"):
        namespace: dict[str, object] = {"__name__": "learner"}  # exec needs a plain dict, not the _Learner subclass
        try:
            with contextlib.redirect_stdout(_CappedOutput()), _fake_input([], NO_INPUT):
                _execute(code, namespace)
        except BaseException as e:  # every learner error is reported, never raised
            return {"error": _learner_error(e), "results": []}
        learner.update(namespace)
    tests_found = [(name, fn) for name, fn in list(scope.items()) if name.startswith("test_") and callable(fn)]
    results = [_run_one_test(_test_label(name, fn), fn) for name, fn in tests_found]
    if cases:
        results.append(_run_cases(code, cases, strict, scope))
    return {"error": None, "results": results}


def _plain(value: object) -> object:
    """A NumPy scalar as the Python number it holds, so np.int64(3) and 3 compare alike."""
    item = getattr(value, "item", None)
    if type(value).__module__ == "numpy" and getattr(value, "ndim", None) == 0 and callable(item):
        return item()
    return value


def _equal(actual: object, expected: object) -> bool:
    if isinstance(actual, float) and isinstance(expected, float) and math.isnan(actual) and math.isnan(expected):
        return True
    equals = getattr(actual, "equals", None)  # pandas
    if callable(equals):
        return bool(equals(expected))
    shape, tolist = getattr(actual, "shape", None), getattr(actual, "tolist", None)
    if shape is not None and callable(tolist):  # NumPy array; _same already made sure both have its type
        expected_list = getattr(expected, "tolist", None)
        return callable(expected_list) and shape == getattr(expected, "shape", None) and tolist() == expected_list()
    return bool(actual == expected)


def _same(actual: object, expected: object) -> bool:
    """== that also wants the same types all the way down, so True is not 1 and 2.0 is not 2."""
    actual, expected = _plain(actual), _plain(expected)
    if type(actual) is not type(expected):
        return False
    if isinstance(actual, list | tuple) and isinstance(expected, list | tuple):
        return len(actual) == len(expected) and all(map(_same, actual, expected))
    if isinstance(actual, dict) and isinstance(expected, dict):
        return actual.keys() == expected.keys() and all(_same(actual[k], expected[k]) for k in actual)
    return _equal(actual, expected)


def _close(actual: object, expected: object) -> bool:
    """_same, but numbers only need to agree to about nine digits."""
    actual, expected = _plain(actual), _plain(expected)
    numbers = int | float
    if isinstance(actual, numbers) and isinstance(expected, numbers) and not isinstance(actual, bool) \
            and not isinstance(expected, bool):
        return math.isclose(actual, expected, rel_tol=REL_TOL, abs_tol=ABS_TOL)
    if isinstance(actual, list | tuple) and isinstance(expected, list | tuple):
        return type(actual) is type(expected) and len(actual) == len(expected) and all(map(_close, actual, expected))
    if isinstance(actual, dict) and isinstance(expected, dict):
        return actual.keys() == expected.keys() and all(_close(actual[k], expected[k]) for k in actual)
    return _same(actual, expected)


def _unordered(actual: object, expected: object) -> bool:
    if isinstance(actual, list | tuple) and isinstance(expected, list | tuple):
        return type(actual) is type(expected) and _same(sorted(actual, key=repr), sorted(expected, key=repr))
    return _same(actual, expected)


def _array(actual: object, expected: object) -> bool:
    np = importlib.import_module("numpy")  # loaded here, so only array tasks pay for NumPy
    try:
        got, want = np.asarray(actual), np.asarray(expected)
        return got.shape == want.shape and bool(np.allclose(got, want, rtol=REL_TOL, atol=ABS_TOL))
    except (TypeError, ValueError):
        return False


def _frame(actual: object, expected: object) -> bool:
    reset, expected_reset = getattr(actual, "reset_index", None), getattr(expected, "reset_index", None)
    if not callable(reset) or not callable(expected_reset):
        return False
    return bool(reset(drop=True).equals(expected_reset(drop=True)))


def _matches(compare: str, actual: object, expected: object, strict: bool) -> bool:
    comparators: dict[str, Callable[[object, object], bool]] = {
        "exact": _same, "float": _close, "unordered": _unordered, "array": _array, "frame": _frame}
    try:
        if compare == "text":
            return bool(actual == expected) if strict else bool(_forgiving(actual) == _forgiving(expected))
        return comparators[compare](actual, expected)
    except Exception:  # a learner value whose == raises is simply not the expected one
        return False


def _cut(text: str) -> str:
    return text if len(text) <= SHOWN_LENGTH else text[:SHOWN_LENGTH - 3] + "..."


def _shown(value: object) -> str:
    try:
        return _cut(repr(value))
    except Exception:  # the learner's own __repr__ may raise
        return f"a {type(value).__name__} that cannot be shown"


def _setup_imports(case: Case) -> dict[str, object]:
    """A namespace holding only the imports of the case's setup: what its expected value may need."""
    tree = ast.parse(str(case.get("setup", "")))
    imports = ast.Module([node for node in tree.body if isinstance(node, ast.Import | ast.ImportFrom)], [])
    namespace: dict[str, object] = {}
    exec(compile(imports, "setup", "exec"), namespace)
    return namespace


def _is_program(case: CaseInput) -> TypeGuard[ProgramInput]:
    return "stdin" in case


def _answer(code: str, case: CaseInput) -> object:
    """What the code gives for one input, run from scratch so no case sees what an earlier one changed.
    Printing is dropped, except a program's output, which is its answer."""
    out = _CappedOutput()
    with contextlib.redirect_stdout(out):
        if _is_program(case):
            with _fake_input(case["stdin"], TOO_MANY_INPUTS):
                _execute(code, {"__name__": "__main__"})
            return out.getvalue()
        expr = cast(ExprInput, case)
        namespace: dict[str, object] = {"__name__": "learner"}
        with _fake_input([], NO_INPUT):
            _execute(code, namespace)
            exec(expr["setup"], namespace)
            return eval(expr["expr"], namespace)


def _expected_text(case: Case, expected: object) -> str:
    valid = case.get("valid")
    if valid:
        return f"an answer {valid} accepts"
    raises = case.get("raises")
    return str(raises) if raises else _shown(expected)


def _accepted(judge: object, inputs: object, answer: object) -> bool:
    try:
        return callable(judge) and bool(judge(inputs, answer))
    except Exception:  # a validity function that chokes on the answer does not accept it
        return False


def _raised(error: BaseException) -> str:
    message = _cut(str(error))
    return f"your code raised {type(error).__name__}" + (f": {message}" if message else "")


def _case_failure(code: str, case: Case, strict: bool, scope: dict[str, object]) -> str | None:
    """The learner's message for a case the code gets wrong, or None when it gets it right."""
    try:
        expected = eval(case["expect"], _setup_imports(case))
    except Exception as e:  # the task's own data is broken; say so instead of crashing the Check
        return f"We also tried {case['show']}, but its expected value could not be read ({type(e).__name__}): " \
               "please report this task."
    tried = f"We also tried {case['show']}: expected {_expected_text(case, expected)}"
    try:
        answer = _answer(code, case)
    except Failure as f:
        return f"{tried}, your code stopped: {f}."
    except (Exception, SystemExit) as e:  # the learner's error is the answer, never a crash
        return None if case.get("raises") == type(e).__name__ else f"{tried}, {_raised(e)}."
    returned = f"{tried}, your code returned {_shown(answer)}."
    if case.get("raises"):
        return returned
    valid = case.get("valid")
    if valid:
        return None if _accepted(scope.get(valid), expected, answer) else returned
    return None if _matches(case["compare"], answer, expected, strict) else returned


def _run_cases(code: str, cases: Sequence[Case], strict: bool, scope: dict[str, object]) -> TestResult:
    """One result: the first case the code gets wrong, or a summary when it gets them all right."""
    name = f"{len(cases)} more input{'' if len(cases) == 1 else 's'}"
    for case in cases:
        failure = _case_failure(code, case, strict, scope)
        if failure:
            return {"name": name, "passed": False, "message": failure, "hidden": True}
    return {"name": name, "passed": True, "message": "", "hidden": True}


def _library_source(value: object) -> str | None:
    """NumPy and pandas values as source that evaluates without the learner's imports, dtype and index kept."""
    module, kind = type(value).__module__.split(".")[0], type(value).__name__
    tolist, dtype = getattr(value, "tolist", None), getattr(value, "dtype", None)
    index = getattr(getattr(value, "index", None), "tolist", None)
    if module == "numpy" and callable(tolist):
        return f"__import__('numpy').array({tolist()!r}, dtype={str(dtype)!r})"
    if module != "pandas" or not callable(index):
        return None
    if kind == "Series" and callable(tolist):
        return f"__import__('pandas').Series({tolist()!r}, index={index()!r}, dtype={str(dtype)!r}, " \
               f"name={getattr(value, 'name', None)!r})"
    to_dict, dtypes = getattr(value, "to_dict", None), getattr(value, "dtypes", None)
    if kind == "DataFrame" and callable(to_dict) and dtypes is not None:
        types = {column: str(t) for column, t in dtypes.items()}
        return f"__import__('pandas').DataFrame({to_dict('list')!r}, index={index()!r}).astype({types!r})"
    return None


def _source(value: object) -> str:
    """Python source for an answer. Sets are written sorted, so the bundle is the same on every build."""
    value = _plain(value)
    if type(value) is float and not math.isfinite(value):
        return f"float({str(value)!r})"
    if type(value) is list or type(value) is tuple:
        items = ", ".join(map(_source, value))
        return f"[{items}]" if type(value) is list else f"({items},)" if len(value) == 1 else f"({items})"
    if type(value) is dict:
        return "{" + ", ".join(f"{_source(k)}: {_source(v)}" for k, v in value.items()) + "}"
    if type(value) is set or type(value) is frozenset:
        items = ", ".join(sorted(map(_source, value)))
        if type(value) is frozenset:
            return f"frozenset({{{items}}})" if items else "frozenset()"
        return f"{{{items}}}" if items else "set()"
    return _library_source(value) or repr(value)


def _written(value: object) -> str | None:
    """The answer's source, or None when that source does not evaluate back to the same value."""
    try:
        source = _source(value)
        return source if _same(eval(source, {}), value) else None
    except Exception:  # a repr that is not Python, or one that raises: the answer cannot ship
        return None


def expect_values(code: str, inputs: Sequence[CaseInput]) -> ExpectResult:
    """The model solution's answer for each input: what hidden cases expect."""
    values: list[ExpectedValue] = []
    with _fresh_dir():
        for case in inputs:
            try:
                answer = _answer(code, case)
            except (Exception, SystemExit) as e:  # a raise is an answer too
                values.append({"repr": "None", "raises": type(e).__name__})
                continue
            values.append({"repr": _written(answer), "raises": None})
    return {"values": values}


def _owned_names(tree: ast.AST) -> tuple[set[str], set[str]]:
    """The names the code defines itself: (every name it binds, the functions and classes it defines)."""
    bound: set[str] = set()
    defined: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef):
            bound.add(node.name)
            defined.add(node.name)
        elif isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
            bound.add(node.id)
        elif isinstance(node, ast.arg):
            bound.add(node.arg)
    return bound, defined


def _decorator_name(expr: ast.expr) -> str:
    """`property` for @property, `dataclass` for @dataclass(order=True), `setter` for @age.setter."""
    if isinstance(expr, ast.Call):
        return _decorator_name(expr.func)
    if isinstance(expr, ast.Attribute):
        return expr.attr
    return expr.id if isinstance(expr, ast.Name) else ast.unparse(expr)


def _call_detectors(node: ast.Call, bound: set[str], defined: set[str]) -> Iterator[str]:
    func = node.func
    if isinstance(func, ast.Name) and func.id in BUILTIN_NAMES and func.id not in bound:
        yield f"call:{func.id}"
    elif isinstance(func, ast.Attribute) and func.attr not in defined:
        yield f"method:{func.attr}"
    callee = func.id if isinstance(func, ast.Name) else func.attr if isinstance(func, ast.Attribute) else None
    if callee:
        yield from (f"{KWARG_PREFIX}{callee}.{kw.arg}" for kw in node.keywords if kw.arg)


def _found_detectors(tree: ast.AST, own_names: Collection[str]) -> set[str]:
    bound, defined = _owned_names(tree)
    bound |= set(own_names)
    defined |= set(own_names)
    found: set[str] = set()
    for node in ast.walk(tree):
        if type(node).__name__ in TRACKED_NODES:
            found.add(f"node:{type(node).__name__}")
        if isinstance(node, ast.Call):
            found.update(_call_detectors(node, bound, defined))
        elif isinstance(node, ast.Import):
            found.update(f"import:{alias.name}" for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            found.add(f"import:{'.' * node.level}{node.module or ''}")
        if isinstance(node, ast.FunctionDef | ast.AsyncFunctionDef | ast.ClassDef):
            found.update(f"decorator:{_decorator_name(d)}" for d in node.decorator_list)
    return found


def detect_features(code: str, vocabulary: Mapping[str, Sequence[str]], own_names: Collection[str] = ()) -> set[str]:
    """The feature ids the code uses. `vocabulary` maps a feature id to its detectors (node:<AstClass>,
    call:<builtin>, method:<name>, import:<module>, decorator:<name>, kwarg:<call>.<name>). A builtin call, method
    call, import, decorator or tracked node with no feature gives `unknown:<detector>`. A method the code defines
    (or `own_names` lists, for a snippet whose class lives elsewhere) is the learner's own, not a feature.
    Code that does not parse uses none."""
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return set()
    feature_of = {detector: feature for feature, detectors in vocabulary.items() for detector in detectors}
    features: set[str] = set()
    for detector in _found_detectors(tree, own_names):
        if detector in feature_of:
            features.add(feature_of[detector])
        elif not detector.startswith(KWARG_PREFIX):
            features.add(f"unknown:{detector}")
    return features


def features_job(queries: Sequence[FeatureQuery], vocabulary: Mapping[str, Sequence[str]]) -> FeaturesResult:
    return {"features": [sorted(detect_features(q["code"], vocabulary, q.get("own_names", ()))) for q in queries]}


def run_code_json(code: str, inputs_json: str) -> str:
    inputs: list[str] = json.loads(inputs_json)
    return json.dumps(run_code(code, inputs))


def run_tests_json(code: str, tests: str, strict: bool = False, cases_json: str = "[]",
                   requires_json: str = "[]") -> str:
    cases: list[Case] = json.loads(cases_json)
    requires: list[Required] = json.loads(requires_json)
    return json.dumps(run_tests(code, tests, strict, cases, requires))


def _run_job(job: dict[str, object]) -> RunResult | CheckResult | ExpectResult | FeaturesResult:
    if job["mode"] == "features":
        return features_job(cast(list[FeatureQuery], job["queries"]), cast(dict[str, list[str]], job["vocabulary"]))
    code = str(job["code"])
    if job["mode"] == "run":
        inputs = job.get("inputs", [])
        return run_code(code, [str(answer) for answer in inputs] if isinstance(inputs, list) else [])
    cases = job.get("cases", [])
    if job["mode"] == "expect":
        return expect_values(code, cases if isinstance(cases, list) else [])
    requires = job.get("requires", [])
    return run_tests(code, str(job["tests"]), bool(job.get("strict", False)), cases if isinstance(cases, list) else [],
                     cast(list[Required], requires) if isinstance(requires, list) else [])


# Pyodide runs this file as __main__ too, but has no stdin job to read.
if __name__ == "__main__" and sys.platform != "emscripten":
    print(json.dumps(_run_job(json.load(sys.stdin))))
