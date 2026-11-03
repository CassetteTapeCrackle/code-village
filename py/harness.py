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
import os
import shutil
import sys
import tempfile
import traceback
from collections.abc import Callable, Iterable, Iterator, Sequence
from typing import TypedDict

MAX_OUTPUT = 10_000
LEARNER_FILE = "your_code.py"
HEAVY_LIBRARIES = {"numpy", "pandas", "sklearn", "scipy"}
NO_INPUT = "input() was called, but this task gives no input"


class RunResult(TypedDict):
    stdout: str
    error: str | None


class TestResult(TypedDict):
    name: str
    passed: bool
    message: str


class CheckResult(TypedDict):
    error: str | None
    results: list[TestResult]


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


def run_tests(code: str, tests: str, strict: bool = False) -> CheckResult:
    with _fresh_dir():
        return _run_tests(code, tests, strict)


def _test_label(name: str, fn: Callable[[], object]) -> str:
    if fn.__doc__:
        return fn.__doc__.strip().splitlines()[0]
    return name.removeprefix("test_").replace("_", " ")


def _run_one_test(label: str, fn: Callable[[], object]) -> TestResult:
    try:
        with contextlib.redirect_stdout(_CappedOutput()), _fake_input([], NO_INPUT):
            fn()
    except Failure as f:
        return {"name": label, "passed": False, "message": str(f)}
    except AssertionError as a:
        return {"name": label, "passed": False, "message": str(a) or "a check did not hold"}
    except Exception as e:  # a learner bug inside a test is a failed test, not a crash
        return {"name": label, "passed": False, "message": f"your code raised {type(e).__name__}: {e}"}
    return {"name": label, "passed": True, "message": ""}


def _run_tests(code: str, tests: str, strict: bool) -> CheckResult:
    """Tests that set PROGRAM = True run the whole program with run_program(inputs) instead of
    importing the learner's functions, so top-level input() is allowed there and nowhere else."""
    learner = _Learner()

    def run_program(inputs: Iterable[str] = ()) -> str:
        out = _CappedOutput()
        too_many = "input() was called more times than this test gives answers"
        with contextlib.redirect_stdout(out), _fake_input(list(inputs), too_many):
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
    return {"error": None, "results": [_run_one_test(_test_label(name, fn), fn) for name, fn in tests_found]}


def run_code_json(code: str, inputs_json: str) -> str:
    inputs: list[str] = json.loads(inputs_json)
    return json.dumps(run_code(code, inputs))


def run_tests_json(code: str, tests: str, strict: bool = False) -> str:
    return json.dumps(run_tests(code, tests, strict))


def _run_job(job: dict[str, object]) -> RunResult | CheckResult:
    code = str(job["code"])
    if job["mode"] == "run":
        inputs = job.get("inputs", [])
        return run_code(code, [str(answer) for answer in inputs] if isinstance(inputs, list) else [])
    return run_tests(code, str(job["tests"]), bool(job.get("strict", False)))


# Pyodide runs this file as __main__ too, but has no stdin job to read.
if __name__ == "__main__" and sys.platform != "emscripten":
    print(json.dumps(_run_job(json.load(sys.stdin))))
