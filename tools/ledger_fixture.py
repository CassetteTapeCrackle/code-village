"""For tests that edit a fixture's prose: bring its ledgers back in line with its sentences.

Sentences the ledger already knows keep their status; new ones become `not-a-fact` (`advice` for a remember bullet).
"""

from collections.abc import Iterable
from pathlib import Path

from vet.ledger import LedgerEntry, dump_ledger
from vet.load import load_content
from vet.prose import Sentence, boss_units, lesson_units, unit_sentences


def sync_ledger(content: Path) -> None:
    loaded, _ = load_content(content)
    for lesson in loaded.lessons:
        _write(lesson.path.parent / "ledger.toml", lesson.ledger, unit_sentences(lesson_units(lesson)))
    for boss in loaded.bosses:
        _write(boss.folder / "ledger.toml", boss.ledger, unit_sentences(boss_units(boss)))


def _write(path: Path, old: Iterable[LedgerEntry], sentences: Iterable[Sentence]) -> None:
    status = {entry.fp: entry.status for entry in old}
    path.write_text(dump_ledger(
        LedgerEntry(s.fingerprint, s.text, s.where, status.get(s.fingerprint) or (
            "advice" if s.where.startswith("remember:") else "not-a-fact")) for s in sentences))
