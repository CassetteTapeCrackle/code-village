"""Rule test-inspects-code: tests compare what the code does, never how it is written (spec 11)."""

import ast
from collections.abc import Iterable, Iterator

from ..adapter import LanguageAdapter
from ..finding import Finding, subject
from ..model import Content, Item

SOURCE_MODULES = {"inspect", "ast", "dis", "tokenize", "linecache"}
CODE_ATTRIBUTES = {"__code__"}


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
        elif isinstance(node, ast.Call) and (_opens_source(node) or _reads_source_path(node)):
            yield "opens a source file"


def _tests_path(item: Item) -> str:
    return "tests.py" if item.kind in ("task", "variant") else ""


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    del adapter  # reads the tests only
    for item in content.items():
        found = sorted(set(inspections(item.tests)))
        if found:
            about = subject(item.id, item.fingerprint, item.folder / _tests_path(item), content.root)
            yield about.finding("test-inspects-code", f"the tests for {item.seed} {', '.join(found)}: compare what "
                                                      "the code returns or prints, not how it is written")
