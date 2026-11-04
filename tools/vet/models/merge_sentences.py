"""Merges the two reviews of each sentence into the ledgers, and puts everything else on the triage list.

python -m tools.vet.models.merge_sentences vet/results/

vet/results/ holds deepseek-sentences.json and one claude-sentences-<lesson>.json per lesson (the same shape, see
tools/vet/models/review_sentences.py). A sentence is accepted (`decided = "auto"`) only when both families say
`true`, name the same kind of backing, and every proposed assert passes in the harness. An accepted runnable fact
also gets a claim block with the generated id auto-<fp> in lesson.md. Anything else, a disagreement, a false or
unsure verdict, a failing assert, goes to vet/triage.md and stays a ledger-missing gap until the owner decides.
A sentence only one family has reviewed so far waits.

Editing lesson.md changes the lesson's fingerprint, which pins its gaps: run `pnpm gaps` afterwards.
"""

import argparse
import json
import re
import sys
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from pathlib import Path

from ..adapter import LanguageAdapter
from ..ledger import INVENTORY, LedgerEntry, doc_anchor_known, dump_ledger, load_inventory, parse_ledger, status_kind
from ..load import load_content
from ..prose import paragraphs, pending_sentences
from ..python.adapter import PythonAdapter
from .reply import Reply, from_dict

CLAIM_ID = "auto-{fp}"
FRONT_MATTER_END = "\n+++\n"  # the lesson's TOML header closes with a +++ line
CLAIM_BLOCK = "```python claim id={id}\n{code}\n```\n"


class LedgerUnreadable(ValueError):
    """A ledger.toml has problems, so merging would rewrite it from an incomplete reading."""


@dataclass
class Merged:
    entries: dict[Path, list[LedgerEntry]] = field(default_factory=dict)  # new entries by ledger.toml path
    claims: list[tuple[Path, dict[str, str], str]] = field(default_factory=list)  # (lesson.md, sentence, assert)
    triage: list[str] = field(default_factory=list)
    waiting: int = 0


def load_replies(folder: Path) -> tuple[dict[str, Reply], dict[str, Reply]]:
    """The DeepSeek replies and the Claude replies found in the results folder, by sentence fingerprint."""
    return _read(sorted(folder.glob("deepseek-sentences*.json"))), _read(sorted(folder.glob("claude-sentences-*.json")))


def _read(files: Iterable[Path]) -> dict[str, Reply]:
    replies: dict[str, Reply] = {}
    for file in files:
        for raw in json.loads(file.read_text()).get("replies", []):
            replies[str(raw.get("fp"))] = from_dict(str(raw.get("fp")), raw)
    return replies


def backing(reply: Reply) -> tuple[str, str]:
    """What a status names for comparing: its kind, and the url for a docs link."""
    return status_kind(reply.status), reply.status.partition(":")[2] if status_kind(reply.status) == "doc" else ""


def why_not(deepseek: Reply, claude: Reply, failed: Mapping[str, str], anchors: frozenset[str]) -> str | None:
    """Why two replies do not make an accepted entry, None when they do."""
    if deepseek.verdict != "true" or claude.verdict != "true":
        return f"verdicts differ or doubt it (deepseek {deepseek.verdict}, claude {claude.verdict})"
    if backing(deepseek) != backing(claude):
        return f"the two families name different backing (deepseek {deepseek.status}, claude {claude.status})"
    if status_kind(claude.status) == "claim":
        for who, reply in (("deepseek", deepseek), ("claude", claude)):
            if reply.assertion and reply.assertion in failed:
                return f"{who}'s proposed assert failed: {failed[reply.assertion]}"
    if status_kind(claude.status) == "doc" and not doc_anchor_known(claude.status.partition(":")[2], anchors):
        return "the docs link is not in the pinned inventory"
    return None


def failing_asserts(replies: Iterable[Reply], adapter: LanguageAdapter) -> dict[str, str]:
    """For each proposed assert that does not pass: what went wrong."""
    codes = sorted({r.assertion for r in replies if r.assertion and status_kind(r.status) == "claim"})
    failed: dict[str, str] = {}
    for code, ran in zip(codes, adapter.run(codes), strict=True):
        if ran is None:
            failed[code] = "it ran out of time"
        elif ran["error"]:
            failed[code] = (ran["error"].strip().splitlines() or ["an error"])[-1]
    return failed


def merge(content_root: Path, deepseek: Mapping[str, Reply], claude: Mapping[str, Reply],
          adapter: LanguageAdapter) -> Merged:
    content, _ = load_content(content_root)
    pending = pending_sentences(content)
    both = [p for p in pending if p["fp"] in deepseek and p["fp"] in claude]
    failed = failing_asserts([r for p in both for r in (deepseek[p["fp"]], claude[p["fp"]])], adapter)
    anchors = load_inventory() if INVENTORY.is_file() else frozenset()
    merged = Merged(waiting=len(pending) - len(both))
    for sentence in both:
        d, c = deepseek[sentence["fp"]], claude[sentence["fp"]]
        reason = why_not(d, c, failed, anchors)
        if reason is None and status_kind(c.status) == "claim" and sentence["file"].endswith("boss.md"):
            reason = "boss text has no claim blocks: move the fact into a lesson or mark it by hand"
        if reason:
            merged.triage.append(triage_note(sentence, d, c, reason))
        else:
            accept(merged, content_root, sentence, d, c)
    return merged


def accept(merged: Merged, root: Path, sentence: Mapping[str, str], deepseek: Reply, claude: Reply) -> None:
    kind = status_kind(claude.status)
    status = f"claim:{CLAIM_ID.format(fp=sentence['fp'])}" if kind == "claim" else claude.status
    reason = claude.reason if kind == "simplification" else ""
    entry = LedgerEntry(sentence["fp"], sentence["text"], sentence["where"], status, reason, "agree", "agree", "auto")
    source = root / sentence["file"]
    merged.entries.setdefault(source.parent / "ledger.toml", []).append(entry)
    if kind == "claim" and claude.assertion:
        merged.claims.append((source, dict(sentence), claude.assertion))


def triage_note(sentence: Mapping[str, str], deepseek: Reply, claude: Reply, reason: str) -> str:
    lines = [f"## {sentence['item']}: {sentence['where']} <!-- fp:{sentence['fp']} -->", "",
             f"> {sentence['text']}", "", f"- file: {sentence['file']}", f"- why it is here: {reason}"]
    for who, reply in (("deepseek", deepseek), ("claude", claude)):
        lines.append(f"- {who}: {reply.verdict}, {reply.status}. {reply.reason}")
    proposed = claude.assertion or deepseek.assertion
    if proposed:
        lines += ["- proposed assert:", "", "```python", proposed, "```"]
    return "\n".join(lines) + "\n"


def insert_claim(lesson_text: str, sentence: Mapping[str, str], code: str) -> str:
    """The lesson with a claim block after the paragraph holding the sentence, or at the end when the sentence
    comes from a remember bullet, a task or a hint."""
    block = CLAIM_BLOCK.format(id=CLAIM_ID.format(fp=sentence["fp"]), code=code.strip("\n"))
    body_at = lesson_text.find(FRONT_MATTER_END) + len(FRONT_MATTER_END)  # the front matter holds remember bullets too
    if sentence["where"].startswith("text:"):
        for found in re.finditer(r"\S(?:.*\S)?(?:\n(?!\s*\n).*\S)*", lesson_text[body_at:]):
            if sentence["paragraph"] in paragraphs(found.group()):
                at = body_at + found.end()
                return lesson_text[:at] + "\n\n" + block.rstrip("\n") + lesson_text[at:]
    return lesson_text.rstrip("\n") + "\n\n" + block


def write(merged: Merged, triage_path: Path) -> None:
    for ledger_path, new in merged.entries.items():
        old, problems = parse_ledger(ledger_path.read_text()) if ledger_path.is_file() else ([], [])
        if problems:  # rewriting a ledger that cannot be read whole would lose the owner's decisions
            raise LedgerUnreadable(f"{ledger_path}: {'; '.join(problems)}: fix it, then merge again")
        ledger_path.write_text(dump_ledger([*old, *new]))
    for lesson_md, sentence, code in merged.claims:
        lesson_md.write_text(insert_claim(lesson_md.read_text(), sentence, code))
    known = triage_path.read_text() if triage_path.is_file() else "# Triage\n\nSentences the owner settles.\n"
    fresh = [note for note in merged.triage if re.search(r"fp:(\w+)", note) and f"fp:{_fp(note)} " not in known]
    triage_path.parent.mkdir(parents=True, exist_ok=True)
    triage_path.write_text(known.rstrip("\n") + "\n" + "".join("\n" + note for note in fresh))


def _fp(note: str) -> str:
    match = re.search(r"fp:(\w+)", note)
    return match.group(1) if match else ""


def main(argv: Sequence[str] | None = None, adapter: LanguageAdapter | None = None) -> None:
    args = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    args.add_argument("results", type=Path, help="the folder with the review files (vet/results/)")
    args.add_argument("--content", type=Path, default=Path("content"))
    args.add_argument("--triage", type=Path, default=Path("vet/triage.md"))
    opts = args.parse_args(argv)
    deepseek, claude = load_replies(opts.results)
    if not deepseek or not claude:
        sys.exit(f"merge_sentences: needs both families, found {len(deepseek)} DeepSeek and {len(claude)} Claude "
                 "replies")
    merged = merge(opts.content, deepseek, claude, adapter or PythonAdapter())
    write(merged, opts.triage)
    accepted = sum(len(v) for v in merged.entries.values())
    print(f"merge_sentences: {accepted} accepted, {len(merged.triage)} to triage, {merged.waiting} waiting; "
          f"{len(merged.claims)} claim block(s) added: run pnpm gaps")


if __name__ == "__main__":
    main()
