"""After editing one item: re-pin what is keyed to its fingerprint, without a full run.

python -m tools.vet.repin <item id>... [--drop RULE]...

An item's fingerprint covers its files and its lesson, so editing a test moves it. This rewrites the item's entries in
vet/gaps.toml to the new fingerprint (dropping the rules named by --drop, for gaps the edit has fixed) and judges the
stored blind-solver attempts again against the new tests, keeping their triage. Run `pnpm gaps --write` to confirm.
"""

import argparse
import json
import sys
from collections.abc import Iterable, Sequence
from dataclasses import replace
from pathlib import Path

from .blind_eval import group_id, judge_attempt
from .checks.blind import result_path
from .finding import GapKey
from .gaps import GAPS_PATH, dump_gaps, load_gaps
from .load import load_content
from .model import Content
from .python.adapter import PythonAdapter

ROOT = Path(__file__).resolve().parents[2]


def repin_gaps(gaps: Iterable[GapKey], fingerprints: dict[str, str], drop: frozenset[str]) -> set[GapKey]:
    """The gap keys with the named items' fingerprints replaced, and their dropped rules removed."""
    kept: set[GapKey] = set()
    for key in gaps:
        if key.item not in fingerprints:
            kept.add(key)
        elif key.rule not in drop:
            kept.add(replace(key, fingerprint=fingerprints[key.item]))
    return kept


def fingerprints_of(content: Content, ids: Sequence[str]) -> dict[str, str]:
    found = {item.id: item.fingerprint for item in content.items() if item.id in ids}
    if missing := [i for i in ids if i not in found]:
        raise KeyError(f"no task, variant or boss with the id {', '.join(missing)}")
    return found


def refresh_blind(content: Content, folder: Path, ids: Sequence[str]) -> list[str]:
    """Judge the stored attempts of the items again against their current tests; the ids whose run was refreshed."""
    adapter = PythonAdapter()
    refreshed = []
    for group in content.solution_groups():
        path = result_path(folder, group_id(group))
        if group_id(group) not in ids or path is None or not path.is_file():
            continue
        stored = json.loads(path.read_text())
        attempts = [judge_attempt(group, a["code"], adapter) | {"temperature": a["temperature"]}
                    for a in stored["attempts"]]
        path.write_text(json.dumps({**stored, "fingerprint": group[0].fingerprint, "attempts": attempts},
                                   indent=2, ensure_ascii=False) + "\n")
        refreshed.append(group_id(group))
    return refreshed


def main(argv: Sequence[str] | None = None) -> None:
    args = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    args.add_argument("ids", nargs="+")
    args.add_argument("--drop", action="append", default=[], help="a rule whose gap the edit fixed")
    opts = args.parse_args(argv)
    content, _ = load_content(ROOT / "content")
    try:
        fingerprints = fingerprints_of(content, opts.ids)
    except KeyError as e:
        sys.exit(f"repin: {e.args[0]}")
    GAPS_PATH.write_text(dump_gaps(repin_gaps(load_gaps(GAPS_PATH), fingerprints, frozenset(opts.drop))))
    refreshed = refresh_blind(content, ROOT / "vet" / "blind", opts.ids)
    print(f"repin: {len(fingerprints)} item(s) re-pinned, blind runs refreshed: {', '.join(refreshed) or 'none'}")


if __name__ == "__main__":
    main()
