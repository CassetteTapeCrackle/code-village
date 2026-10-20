"""Run a learner's code, alone or against a task's tests.

The same file runs in CPython (tools/content_check.py, at build time) and in Pyodide (the browser),
so a task that passes the build passes in the browser. Messages are written for learners.
"""

import ast
import builtins
import contextlib
import importlib
import io
import json
import os
import shutil
import sys
import tempfile
import traceback

MAX_OUTPUT = 10_000
LEARNER_FILE = "your_code.py"
HEAVY_LIBRARIES = {"numpy", "pandas", "sklearn", "scipy"}


class Failure(Exception):
    """A test's own failure, with a message meant for the learner."""


class _CappedOutput(io.StringIO):
    def write(self, s):
        room = MAX_OUTPUT - self.tell()
        if room <= 0:
            return len(s)
        if len(s) > room:
            super().write(s[:room] + "\n(output cut)\n")
            return len(s)
        return super().write(s)


@contextlib.contextmanager
def _fake_input(answers, message, echo=False):
    """echo=True prints prompt and answer like a terminal (Run); checks leave prompts out of the output,
    so `input("Name: ")` passes the same tests as `input()`."""
    feed = iter(answers)
    original = builtins.input

    def fake(prompt=""):
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


def _learner_error(error):
    """The error as the learner should see it: only frames from their own file."""
    if isinstance(error, Failure):
        return str(error)
    if isinstance(error, SyntaxError):
        return f"SyntaxError on line {error.lineno}: {error.msg}"
    tb = traceback.TracebackException.from_exception(error)
    tb.stack = traceback.StackSummary.from_list([f for f in tb.stack if f.filename == LEARNER_FILE])
    return "".join(tb.format()).strip()


@contextlib.contextmanager
def _fresh_dir():
    """Every job starts in an empty folder, so files one run writes never reach the next (or the repo)."""
    home = os.getcwd()
    folder = tempfile.mkdtemp(prefix="job-")
    os.chdir(folder)
    try:
        yield
    finally:
        os.chdir(home)
        shutil.rmtree(folder, ignore_errors=True)


def heavy_imports(source):
    """The big-library modules this code imports, so they can load before the timed run starts."""
    try:
        tree = ast.parse(source)
    except SyntaxError:
        return []
    found = []
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            names = [a.name for a in node.names]
        elif isinstance(node, ast.ImportFrom) and node.module and node.level == 0:
            names = [node.module] + [f"{node.module}.{a.name}" for a in node.names]  # `from sklearn import neighbors`
        else:
            continue
        found += [n for n in names if n.split(".")[0] in HEAVY_LIBRARIES and n not in found]
    return found


def preimport(modules):
    for name in modules:
        try:
            importlib.import_module(name)
        except Exception:  # noqa: BLE001 - not a module (a class), or a typo the timed run will report
            pass


def _execute(code, namespace):
    exec(compile(code, LEARNER_FILE, "exec"), namespace)


def run_code(code, inputs):
    out = _CappedOutput()
    error = None
    with _fresh_dir(), contextlib.redirect_stdout(out), _fake_input(inputs, "input() is waiting for an answer: type it in the input box, one line per input()", echo=True):
        try:
            _execute(code, {"__name__": "__main__"})
        except BaseException as e:  # noqa: BLE001 - every learner error is reported, never raised
            error = _learner_error(e)
    return {"stdout": out.getvalue(), "error": error}


def expect_equal(actual, expected, call=""):
    if actual != expected:
        if call:
            raise Failure(f"{call} returned {actual!r}, expected {expected!r}")
        raise Failure(f"expected {expected!r}, got {actual!r}")


class _Learner(dict):
    """The learner's names, as tests see them; a missing name is a readable failure."""

    def __missing__(self, name):
        raise Failure(f"{name} is not defined in your code")


def run_tests(code, tests):
    with _fresh_dir():
        return _run_tests(code, tests)


def _run_tests(code, tests):
    """Tests that set PROGRAM = True run the whole program with run_program(inputs) instead of
    importing the learner's functions, so top-level input() is allowed there and nowhere else."""
    learner = _Learner()

    def run_program(inputs=()):
        out = _CappedOutput()
        with contextlib.redirect_stdout(out), _fake_input(list(inputs), "input() was called more times than this test gives answers"):
            _execute(code, {"__name__": "__main__"})
        return out.getvalue()

    scope = {"learner": learner, "expect_equal": expect_equal, "run_program": run_program, "Failure": Failure}
    exec(compile(tests, "tests.py", "exec"), scope)
    if not scope.get("PROGRAM"):
        namespace = {"__name__": "learner"}  # exec needs a plain dict, not the _Learner subclass
        try:
            with contextlib.redirect_stdout(_CappedOutput()), _fake_input([], "input() was called, but this task gives no input"):
                _execute(code, namespace)
        except BaseException as e:  # noqa: BLE001
            return {"error": _learner_error(e), "results": []}
        learner.update(namespace)
    results = []
    for name, fn in list(scope.items()):
        if not (name.startswith("test_") and callable(fn)):
            continue
        label = (fn.__doc__ or "").strip().splitlines()[0] if fn.__doc__ else name.removeprefix("test_").replace("_", " ")
        try:
            with contextlib.redirect_stdout(_CappedOutput()), _fake_input([], "input() was called, but this task gives no input"):
                fn()
            results.append({"name": label, "passed": True, "message": ""})
        except Failure as f:
            results.append({"name": label, "passed": False, "message": str(f)})
        except AssertionError as a:
            results.append({"name": label, "passed": False, "message": str(a) or "a check did not hold"})
        except Exception as e:  # noqa: BLE001
            results.append({"name": label, "passed": False, "message": f"your code raised {type(e).__name__}: {e}"})
    return {"error": None, "results": results}


def run_code_json(code, inputs_json):
    return json.dumps(run_code(code, json.loads(inputs_json)))


def run_tests_json(code, tests):
    return json.dumps(run_tests(code, tests))


# Pyodide runs this file as __main__ too, but has no stdin job to read.
if __name__ == "__main__" and sys.platform != "emscripten":
    job = json.load(sys.stdin)
    result = run_code(job["code"], job.get("inputs", [])) if job["mode"] == "run" else run_tests(job["code"], job["tests"])
    print(json.dumps(result))
