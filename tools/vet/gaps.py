"""The tracked gap list, vet/gaps.toml: every finding the content is allowed to have today.

CI fails on a finding that is not listed (new) and on a listed entry no finding matches any more (stale), so
the file is always exact. A pull request may add entries only for a rule it introduces (--base checks this).

Usage, from the repo root under the content pins (see pnpm content):
  python -m tools.vet.gaps --write          rewrite vet/gaps.toml from the current findings
  python -m tools.vet.gaps --base REF       fail if an entry was added for a rule REF already had
"""

import argparse
import subprocess
import sys
import tomllib
from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

from .finding import Finding, GapKey
from .rules import RULES
from .run import vet

ROOT = Path(__file__).resolve().parents[2]
GAPS_PATH = ROOT / "vet" / "gaps.toml"
HEADER = "# Known gaps: written by `python -m tools.vet.gaps --write`. Never edit by hand; fix the content instead.\n"


@dataclass(frozen=True)
class GapDiff:
    new: list[Finding]
    stale: list[GapKey]
    known: list[Finding]

    @property
    def ok(self) -> bool:
        return not self.new and not self.stale


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
    return GapDiff(new=[f for f in findings if f.key not in gaps], stale=sorted(gaps - seen),
                   known=[f for f in findings if f.key in gaps])


def _show(ref: str, path: str, root: Path) -> str:
    """A file as it is at ref, or "" when it does not exist there."""
    done = subprocess.run(["git", "show", f"{ref}:{path}"], cwd=root, capture_output=True, text=True, check=False)
    return done.stdout if done.returncode == 0 else ""


def added_for_old_rules(base: str, root: Path) -> list[GapKey]:
    """Entries added since base for rules base already had: the list may grow only with a new rule."""
    old_rules = tomllib.loads(_show(base, "vet/rules.toml", root)).get("rule", {})
    old_gaps = parse_gaps(_show(base, "vet/gaps.toml", root))
    now = load_gaps(root / "vet" / "gaps.toml")
    return sorted(k for k in now - old_gaps if k.rule in old_rules)


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


def main() -> None:
    args = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    action = args.add_mutually_exclusive_group(required=True)
    action.add_argument("--write", action="store_true", help="rewrite vet/gaps.toml from the current findings")
    action.add_argument("--base", help="git ref to compare vet/gaps.toml against")
    args.add_argument("--content", default=str(ROOT / "content"))
    opts = args.parse_args()
    if opts.base:
        added = added_for_old_rules(opts.base, ROOT)
        for key in added:
            print(f"gap list: {key.rule} {key.item} was added, but rule {key.rule} exists on {opts.base}: "
                  "fix the content instead of listing it")
        sys.exit(1 if added else 0)
    findings = vet(Path(opts.content))
    GAPS_PATH.write_text(dump_gaps(f.key for f in findings))
    print(f"gap list: wrote {len({f.key for f in findings})} entries to {GAPS_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
