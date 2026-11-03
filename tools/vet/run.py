"""vet(): load the content and run every check on it."""

from collections.abc import Callable, Iterable
from pathlib import Path

from .adapter import LanguageAdapter
from .checks import bosses, claims, concepts, hints, ids, solutions, style, worlds, wrong
from .finding import Finding
from .load import load_content
from .model import Content
from .python.adapter import PythonAdapter

CheckFn = Callable[[Content, LanguageAdapter], Iterable[Finding]]
CHECKS: list[CheckFn] = [
    solutions.check, wrong.check, hints.check, claims.check, style.check,
    concepts.check, ids.check, bosses.check, worlds.check,
]


def vet_content(content: Content, adapter: LanguageAdapter) -> list[Finding]:
    """Every finding the checks report on loaded content."""
    return [f for check in CHECKS for f in check(content, adapter)]


def vet(root: Path, adapter: LanguageAdapter | None = None, only: frozenset[str] | None = None) -> list[Finding]:
    """Every finding on the content under root, load problems included; `only` keeps the named rules."""
    content, findings = load_content(root)
    findings += vet_content(content, adapter or PythonAdapter())
    return [f for f in findings if only is None or f.rule in only]
