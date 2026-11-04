"""vet(): load the content and run every check on it, or only the checks behind the rules asked for."""

from collections.abc import Callable, Iterable
from dataclasses import dataclass
from pathlib import Path

from .adapter import LanguageAdapter, ToolError
from .checks import (
    blind,
    bosses,
    cases,
    claims,
    concepts,
    hints,
    ids,
    ledger,
    mutation,
    progression,
    required,
    rewrites,
    right,
    solutions,
    style,
    test_shape,
    versions,
    worlds,
    wrong,
)
from .finding import Finding
from .load import load_content
from .model import Content
from .python.adapter import PythonAdapter

CheckFn = Callable[[Content, LanguageAdapter], Iterable[Finding]]


@dataclass(frozen=True)
class Check:
    """A check and every rule it can report, so a run can skip the checks behind rules nobody asked for."""

    run: CheckFn
    rules: frozenset[str]


CHECKS: list[Check] = [
    Check(solutions.check, frozenset({"solution-fails", "starter-passes"})),
    Check(wrong.check, frozenset({"wrong-passes", "wrong-too-few"})),
    Check(hints.check, frozenset({"hint-code-invalid", "hint-giveaway", "field-invalid"})),
    Check(claims.check, frozenset({"claim-fails", "claim-no-assert", "example-fails", "predict-silent"})),
    Check(style.check, frozenset({"solution-lint"})),
    Check(concepts.check, frozenset({"concept-unnamed", "concept-name-unused", "concept-too-few-tasks",
                                     "concept-no-gotcha"})),
    Check(ids.check, frozenset({"item-id-duplicate"})),
    Check(bosses.check, frozenset({"boss-region-empty", "boss-region-taken"})),
    Check(worlds.check, frozenset({"region-unnamed", "world-key-invalid", "world-order-duplicate", "world-unknown",
                                   "gate-boss-missing", "trophy-mismatch"})),
    Check(cases.check, frozenset({"cases-missing", "cases-decl-invalid", "cases-too-few", "solution-fails-cases"})),
    Check(mutation.check, frozenset({"weak-tests"})),
    Check(rewrites.check, frozenset({"right-refused"})),
    Check(right.check, frozenset({"right-fails"})),
    Check(right.check_missing, frozenset({"right-missing"})),
    Check(test_shape.check, frozenset({"test-inspects-code"})),
    Check(progression.check, frozenset({"untaught-feature", "unknown-feature", "teaches-missing"})),
    Check(required.check, frozenset({"required-untaught", "required-not-in-prompt", "prompt-asks-construct",
                                     "unknown-feature", "field-missing"})),
    Check(ledger.check, frozenset({"ledger-missing", "ledger-stale", "claim-id-unknown", "claim-id-missing",
                                   "doc-anchor-missing", "remember-unbacked", "fence-untyped", "field-invalid"})),
    Check(blind.check, frozenset({"blind-missing", "blind-untriaged", "blind-too-strict", "blind-disagrees"})),
    Check(versions.check, frozenset({"version-differs"})),
    Check(versions.check_min, frozenset({"min-unexplained"})),
]
# the checks that rerun the content many times over; a quick build (pnpm dev, pnpm build) leaves them out
SLOW_RULES = frozenset({"weak-tests", "right-refused", "right-fails", "version-differs"})


class UndeclaredRule(AssertionError):
    """A check reported a rule its CHECKS entry does not list, so runs that pick rules would miss it."""


def vet_content(content: Content, adapter: LanguageAdapter,
                rules: frozenset[str] | None = None) -> tuple[list[Finding], list[str]]:
    """Every finding the checks report on loaded content, and why any check could not run at all. With `rules`,
    only the checks that can report one of them run."""
    findings: list[Finding] = []
    broken = []
    for check in CHECKS:
        if rules is not None and not check.rules & rules:
            continue
        try:
            found = list(check.run(content, adapter))
        except ToolError as e:
            broken.append(str(e))
            continue
        if undeclared := {f.rule for f in found} - check.rules:
            raise UndeclaredRule(f"{check.run.__module__} reported {sorted(undeclared)}: add them to its CHECKS entry")
        findings += found
    return findings, broken


def vet(root: Path, adapter: LanguageAdapter | None = None, only: frozenset[str] | None = None) -> list[Finding]:
    """Every finding on the content under root, load problems included; `only` runs just the checks behind the
    named rules and keeps just those rules."""
    content, findings = load_content(root)
    checked, broken = vet_content(content, adapter or PythonAdapter(), only)
    if broken:
        raise ToolError("; ".join(broken))
    findings += checked
    return [f for f in findings if only is None or f.rule in only]
