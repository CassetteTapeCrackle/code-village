"""vet(): load the content and run every check on it."""

from collections.abc import Callable, Iterable
from pathlib import Path

from .adapter import LanguageAdapter, ToolError
from .checks import bosses, cases, claims, concepts, hints, ids, mutation, rewrites, solutions, style, worlds, wrong
from .finding import Finding
from .load import load_content
from .model import Content
from .python.adapter import PythonAdapter

CheckFn = Callable[[Content, LanguageAdapter], Iterable[Finding]]
CHECKS: list[CheckFn] = [
    solutions.check, wrong.check, hints.check, claims.check, style.check,
    concepts.check, ids.check, bosses.check, worlds.check, cases.check, mutation.check, rewrites.check,
]


def vet_content(content: Content, adapter: LanguageAdapter) -> tuple[list[Finding], list[str]]:
    """Every finding the checks report on loaded content, and why any check could not run at all."""
    findings: list[Finding] = []
    broken = []
    for check in CHECKS:
        try:
            findings += check(content, adapter)
        except ToolError as e:
            broken.append(str(e))
    return findings, broken


def vet(root: Path, adapter: LanguageAdapter | None = None, only: frozenset[str] | None = None) -> list[Finding]:
    """Every finding on the content under root, load problems included; `only` keeps the named rules."""
    content, findings = load_content(root)
    checked, broken = vet_content(content, adapter or PythonAdapter())
    if broken:
        raise ToolError("; ".join(broken))
    findings += checked
    return [f for f in findings if only is None or f.rule in only]
