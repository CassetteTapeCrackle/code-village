"""The tracked gap list, vet/gaps.toml: every finding the content is allowed to have today.

CI fails on a finding that is not listed (new) and on a listed entry no finding matches any more (stale), so
the file is always exact. A pull request may add entries only for a rule it introduces (--base checks this).

Usage: pnpm gaps --write (rewrite vet/gaps.toml from the current findings on content/), or
pnpm gaps --base REF (fail if an entry was added for a rule REF already had). The script carries the pins.
"""

import argparse
import subprocess
import sys
import tomllib
from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

from .checks.libraries import environment_problems
from .finding import Finding, GapKey
from .rules import RULES, SEVERITIES
from .run import vet

ROOT = Path(__file__).resolve().parents[2]
GAPS_PATH = ROOT / "vet" / "gaps.toml"
HEADER = "# Known gaps: written by `pnpm gaps --write`. Never edit by hand; fix the content instead.\n"
# a file the loader cannot read leaves the bundle without fields it needs, so these always fail the build
NEVER_LISTED = frozenset({"file-unreadable", "field-missing", "field-invalid"})


@dataclass(frozen=True)
class GapDiff:
    new: list[Finding]
    stale: list[GapKey]
    known: list[Finding]


def parse_gaps(text: str) -> set[GapKey]:
    entries = tomllib.loads(text).get("gap", [])
    return {GapKey(str(e["rule"]), str(e["item"]), str(e["fingerprint"])) for e in entries}


def load_gaps(path: Path) -> set[GapKey]:
    return parse_gaps(path.read_text()) if path.exists() else set()


def _quote(text: str) -> str:
    return '"' + text.replace("\\", "\\\\").replace('"', '\\"') + '"'


def dump_gaps(keys: Iterable[GapKey]) -> str:
    entries = [f"[[gap]]\nrule = {_quote(k.rule)}\nitem = {_quote(k.item)}\nfingerprint = {_quote(k.fingerprint)}\n"
               for k in sorted(set(keys))]
    return HEADER + "\n" + "\n".join(entries)


def compare(findings: Iterable[Finding], gaps: set[GapKey]) -> GapDiff:
    findings = list(findings)
    seen = {f.key for f in findings}
    listed = {f.key for f in findings if f.key in gaps and f.rule not in NEVER_LISTED}
    return GapDiff(new=[f for f in findings if f.key not in listed], stale=sorted(gaps - seen),
                   known=[f for f in findings if f.key in listed])


class BaseError(ValueError):
    """The --base ref does not exist here, so nothing can be compared with it."""


def _show(ref: str, path: str, root: Path) -> str:
    """A file as it is at ref, or "" when it does not exist there."""
    done = subprocess.run(["git", "show", f"{ref}:{path}"], cwd=root, capture_output=True, text=True, check=False)
    return done.stdout if done.returncode == 0 else ""


def _verify(ref: str, root: Path) -> None:
    done = subprocess.run(["git", "rev-parse", "--verify", "--quiet", f"{ref}^{{commit}}"], cwd=root,
                          capture_output=True, check=False)
    if done.returncode != 0:
        raise BaseError(f"gap list: {ref} is not a commit here: fetch it first")


def added_for_old_rules(base: str, root: Path) -> list[GapKey]:
    """Entries added since base for rules base already had: the list may grow only with a new rule.

    Rule and item are compared, not the fingerprint: editing an item with a known gap re-pins its entry,
    which is not a new gap.
    """
    _verify(base, root)
    old_rules = tomllib.loads(_show(base, "vet/rules.toml", root)).get("rule", {})
    old_pairs = {(k.rule, k.item) for k in parse_gaps(_show(base, "vet/gaps.toml", root))}
    now = load_gaps(root / "vet" / "gaps.toml")
    return sorted(k for k in now if (k.rule, k.item) not in old_pairs and k.rule in old_rules)


def world_of(finding: Finding) -> str:
    """The world folder a finding's file sits in, or "all" for files shared by every world."""
    head = finding.path.split("/", 1)[0]
    return head if "/" in finding.path else "all"


def world_summary(findings: Iterable[Finding]) -> str:
    """Markdown counts of known gaps per world and rule, for the CI job summary."""
    counts = Counter((world_of(f), f.rule) for f in findings)
    lines = ["## Known content gaps", "", "| World | Rule | Severity | Count |", "| --- | --- | --- | --- |"]
    lines += [f"| {world} | {rule} | {RULES[rule].severity if rule in RULES else '?'} | {n} |"
              for (world, rule), n in sorted(counts.items())]
    return "\n".join(lines) + "\n" if counts else "## Known content gaps\n\nNone.\n"


def gap_report(findings: Iterable[Finding]) -> str:
    """Markdown for docs/test-framework/GAPS.md: counts per severity (worst first), then per world and rule."""
    known = [f for f in findings if f.rule not in NEVER_LISTED]
    order = {name: at for at, name in enumerate(SEVERITIES)}
    by_severity = Counter(RULES[f.rule].severity if f.rule in RULES else "?" for f in known)
    lines = ["# Known content gaps", "",
             "Written by `python -m tools.vet.gaps --write --summary docs/test-framework/GAPS.md`; the list itself is",
             "`vet/gaps.toml`. Worst severity first.", "", "| Severity | Gaps |", "| --- | --- |"]
    lines += [f"| {name} | {n} |" for name, n in sorted(by_severity.items(), key=lambda kv: order.get(kv[0], 99))]
    return "\n".join(lines) + f"\n\n**{len(known)} findings in all.**\n\n" + world_summary(known).replace(
        "## Known content gaps", "## By world and rule")


def main() -> None:
    args = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    action = args.add_mutually_exclusive_group(required=True)
    action.add_argument("--write", action="store_true", help="rewrite vet/gaps.toml from the current findings")
    action.add_argument("--base", help="git ref to compare vet/gaps.toml against")
    args.add_argument("--summary", help="with --write, also write the per-severity and per-world counts here")
    opts = args.parse_args()
    if opts.base:
        try:
            added = added_for_old_rules(opts.base, ROOT)
        except BaseError as e:
            sys.exit(str(e))
        for key in added:
            print(f"gap list: {key.rule} {key.item} was added, but rule {key.rule} exists on {opts.base}: "
                  "fix the content instead of listing it")
        sys.exit(1 if added else 0)
    machine = environment_problems()
    if machine:  # a wrong Python or library would write its own failures in as gaps
        sys.exit("\n".join(machine))
    findings = vet(ROOT / "content")
    keys = {f.key for f in findings if f.rule not in NEVER_LISTED}
    GAPS_PATH.write_text(dump_gaps(keys))
    print(f"gap list: wrote {len(keys)} entries to {GAPS_PATH.relative_to(ROOT)}")
    if opts.summary:
        Path(opts.summary).write_text(gap_report(findings))


if __name__ == "__main__":
    main()
