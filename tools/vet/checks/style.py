"""Rule solution-lint: model solutions are what learners copy, so they must pass the linter."""

import subprocess
import sys
from collections.abc import Iterable
from pathlib import Path

from ..adapter import LanguageAdapter, ToolError
from ..finding import Finding, subject
from ..model import Content, fingerprint_text

# ignored: zip(strict=) is not taught, and assert False is how the testing lessons fail a test by hand
LINT_RULES = ["--select", "E,F,W,B,SIM", "--ignore", "E501,B905,B011"]
RUFF_LIMIT = 60


def _ruff(paths: list[str]) -> str:
    command = [sys.executable, "-m", "ruff", "check", "--isolated", "--no-cache", "--output-format", "concise",
               *LINT_RULES, *paths]
    try:
        done = subprocess.run(command, capture_output=True, text=True, timeout=RUFF_LIMIT, check=False)
    except subprocess.TimeoutExpired as e:
        raise ToolError(f"ruff ran longer than {RUFF_LIMIT} s") from e
    if "No module named ruff" in done.stderr:
        raise ToolError("ruff is missing: run the check with pnpm content")
    if done.returncode not in (0, 1):  # 1 means rules were broken, anything else means ruff itself failed
        raise ToolError(f"ruff failed: {(done.stderr.strip().splitlines() or ['no output'])[-1]}")
    return done.stdout


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    root = content.root.resolve()
    solutions = sorted(str(p) for p in root.rglob("solution.py"))
    for line in _ruff(solutions).splitlines():
        path, sep, rest = line.partition(".py:")
        if not sep:
            continue
        # ruff prints a path relative to the working folder when the file lies under it, absolute otherwise
        solution = Path(path + ".py").resolve()
        where = str(solution.relative_to(root))
        yield subject(where, fingerprint_text(solution.read_text()), solution, root).finding(
            "solution-lint", f"the solution breaks a lint rule: {rest}")
