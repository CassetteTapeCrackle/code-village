"""Rule test-inspects-code: tests compare what the code does, never how it is written (spec 11)."""

import ast
import re
from collections.abc import Iterable, Iterator

from ..adapter import LanguageAdapter
from ..finding import Finding, subject
from ..model import Content, Item
from .cases import learner_names

SOURCE_MODULES = {"inspect", "ast", "dis", "tokenize", "linecache"}
CODE_ATTRIBUTES = {"__code__"}
# what a test learns from a learner function without calling it: its name, docs, signature and wrapping
FUNCTION_ATTRIBUTES = {"__name__", "__qualname__", "__doc__", "__defaults__", "__kwdefaults__", "__annotations__",
                       "__module__", "__wrapped__", "__closure__", "__globals__"}


def _is_learner_name(node: ast.expr) -> bool:
    """learner["name"]: something the learner defined."""
    return isinstance(node, ast.Subscript) and isinstance(node.value, ast.Name) and node.value.id == "learner"


def _opens_source(node: ast.Call) -> bool:
    """open() on a .py file or on __file__.
    shortcut: open(name) with name a variable is allowed (file tasks write data files that way), upgrade to
    tracking the value if a test ever reads source through a variable."""
    if not (isinstance(node.func, ast.Name) and node.func.id == "open" and node.args):
        return False
    target = node.args[0]
    if isinstance(target, ast.Constant) and isinstance(target.value, str):
        return target.value.endswith(".py")
    return any(isinstance(n, ast.Name) and n.id == "__file__" for n in ast.walk(target))


def _reads_source_path(node: ast.Call) -> bool:
    """`Path("x.py").read_text()` and the like."""
    func = node.func
    if not (isinstance(func, ast.Attribute) and func.attr in ("read_text", "read_bytes")):
        return False
    return any((isinstance(n, ast.Constant) and isinstance(n.value, str) and n.value.endswith(".py"))
               or (isinstance(n, ast.Name) and n.id == "__file__") for n in ast.walk(func.value))


def inspections(tests: str) -> Iterator[str]:
    """What in tests looks at the code itself, one phrase each."""
    try:
        tree = ast.parse(tests)
    except SyntaxError:
        return  # solution-fails reports a tests.py that does not parse
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            yield from (f"imports {a.name}" for a in node.names if a.name.split(".")[0] in SOURCE_MODULES)
        elif isinstance(node, ast.ImportFrom) and (node.module or "").split(".")[0] in SOURCE_MODULES:
            yield f"imports from {node.module}"
        elif isinstance(node, ast.Attribute) and node.attr in CODE_ATTRIBUTES:
            yield f"reads {node.attr}"
        elif isinstance(node, ast.Attribute) and node.attr in FUNCTION_ATTRIBUTES and _is_learner_name(node.value):
            yield f"reads {node.attr} of the learner's code"
        elif isinstance(node, ast.Call) and (_opens_source(node) or _reads_source_path(node)):
            yield "opens a source file"


def _tests_path(item: Item) -> str:
    return "tests.py" if item.kind in ("task", "variant") else ""


def keyword_arguments(tests: str) -> set[str]:
    """Names passed by keyword in calls on the learner's own functions and classes: learner["f"](n=2)."""
    try:
        tree = ast.parse(tests)
    except SyntaxError:
        return set()
    return {kw.arg for node in ast.walk(tree) if isinstance(node, ast.Call) and _is_learner_name(node.func)
            for kw in node.keywords if kw.arg}


def check_keywords(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    """Rule test-keyword-unnamed: a parameter name counts as part of the task only when the prompt names it."""
    del adapter  # reads the tests and prompts only
    for item in content.items():
        unnamed = sorted(n for n in keyword_arguments(item.tests) if not re.search(rf"\b{re.escape(n)}\b", item.prompt))
        if unnamed:
            about = subject(item.id, item.fingerprint, item.folder / _tests_path(item), content.root)
            yield about.finding("test-keyword-unnamed", f"the tests for {item.seed} call the learner's code with "
                                                        f"{', '.join(n + '=' for n in unnamed)}, but the prompt never "
                                                        "names that parameter: a right answer with another name is "
                                                        "refused. Name it in the prompt, or call by position")


REACHES_LEARNER = {"learner", "run_program"}
BROAD_HANDLERS = {"Exception", "BaseException", "AssertionError"}


def _test_functions(tree: ast.Module) -> list[ast.FunctionDef]:
    return [n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name.startswith("test_")]


def tests_without_learner(tests: str) -> list[str]:
    """The tests that never reach the learner's code, even through the helper functions they call."""
    try:
        tree = ast.parse(tests)
    except SyntaxError:
        return []
    helpers = {n.name: n for n in tree.body if isinstance(n, ast.FunctionDef)}

    def reaches(function: ast.FunctionDef, seen: frozenset[str]) -> bool:
        names = {n.id for n in ast.walk(function) if isinstance(n, ast.Name)}
        return bool(names & REACHES_LEARNER) or any(
            reaches(helpers[name], seen | {name}) for name in names & helpers.keys() - seen)

    return [f.name for f in _test_functions(tree) if not reaches(f, frozenset({f.name}))]


def swallowing_tests(tests: str) -> list[str]:
    """The tests with a try whose handler catches any failure, and no raise anywhere in the test to fail it later (a
    test of the learner's own test catches the AssertionError and raises Failure when none came)."""
    try:
        tree = ast.parse(tests)
    except SyntaxError:
        return []
    found = []
    for function in _test_functions(tree):
        if any(isinstance(node, ast.Raise) for node in ast.walk(function)):
            continue
        for node in ast.walk(function):
            if isinstance(node, ast.ExceptHandler) and not any(isinstance(n, ast.Raise) for n in ast.walk(node)):
                caught = node.type.id if isinstance(node.type, ast.Name) else None
                if node.type is None or caught in BROAD_HANDLERS:
                    found.append(function.name)
    return found


def check_bodies(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    """Rules test-without-learner and test-swallows-failure: every test must be able to fail on the learner's code."""
    del adapter  # reads the tests only
    for item in content.items():
        about = subject(item.id, item.fingerprint, item.folder / _tests_path(item), content.root)
        if loose := tests_without_learner(item.tests):
            yield about.finding("test-without-learner", f"{', '.join(loose)} in the tests for {item.seed} never "
                                                        "calls the learner's code, so it passes whatever is written")
        if caught := swallowing_tests(item.tests):
            yield about.finding("test-swallows-failure", f"{', '.join(sorted(set(caught)))} in the tests for "
                                                         f"{item.seed} catches every failure without raising it "
                                                         "again, so it cannot fail")


def check_names(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    """Rule test-name-unnamed: a test may ask the learner's code only for names the learner was told to write: the
    prompts of the item's group (a boss's stages and intro), or the starter, name them."""
    del adapter  # reads the tests, prompts and starters only
    for group in content.solution_groups():
        told = "\n".join([group[0].starter, *(item.prompt for item in group)])
        for item in group:
            unnamed = sorted(n for n in learner_names(item.tests) if not re.search(rf"\b{re.escape(n)}\b", told))
            if unnamed:
                about = subject(item.id, item.fingerprint, item.folder / _tests_path(item), content.root)
                yield about.finding("test-name-unnamed", f"the tests for {item.seed} ask the learner's code for "
                                                         f"{', '.join(unnamed)}, which neither the prompt nor the "
                                                         "starter names: a right answer cannot know to write it")


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    del adapter  # reads the tests only
    for item in content.items():
        found = sorted(set(inspections(item.tests)))
        if found:
            about = subject(item.id, item.fingerprint, item.folder / _tests_path(item), content.root)
            yield about.finding("test-inspects-code", f"the tests for {item.seed} {', '.join(found)}: compare what "
                                                      "the code returns or prints, not how it is written")
