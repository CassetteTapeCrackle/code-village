"""The ledger rules on copies of the good fixture: what re-opens a sentence and what does not."""

import json
import subprocess
import sys
import unittest
from pathlib import Path

from test_vet_progression import content_copy
from vet import vet
from vet.load import load_content
from vet.prose import pending_sentences

RULES = frozenset({"ledger-missing", "ledger-stale", "claim-id-unknown", "claim-id-missing", "doc-anchor-missing",
                   "remember-unbacked", "fence-untyped", "field-invalid", "claim-id-duplicate"})
LESSON = "w1/a/basics/lesson.md"
LEDGER = "w1/a/basics/ledger.toml"


def rules(content: Path) -> list[str]:
    return sorted(f.rule for f in vet(content, only=RULES))


def edit(content: Path, name: str, old: str, new: str) -> None:
    path = content / name
    text = path.read_text()
    assert old in text, old
    path.write_text(text.replace(old, new, 1))


class Reopening(unittest.TestCase):
    def test_editing_one_word_opens_the_sentence_again(self) -> None:
        with content_copy() as content:
            edit(content, LESSON, "Numbers can be multiplied.", "Numbers can be multiplied together.")
            self.assertEqual(rules(content), ["ledger-missing", "ledger-stale"])

    def test_reflowing_a_sentence_does_not(self) -> None:
        with content_copy() as content:
            edit(content, LESSON, "Numbers can be multiplied.", "Numbers   can\nbe multiplied.")
            self.assertEqual(rules(content), [])

    def test_a_reviewed_task_prompt_is_pinned_too(self) -> None:
        with content_copy() as content:
            edit(content, "w1/a/basics/tasks/half/task.toml", "Write `half(n)`.", "Write `half(n)` now.")
            self.assertEqual(rules(content), ["ledger-missing", "ledger-stale"])


class Provenance(unittest.TestCase):
    def test_an_entry_must_say_who_settled_it(self) -> None:
        with content_copy() as content:
            edit(content, LEDGER, 'where = "text:0"\nstatus = "claim:times-two"\ndecided = "owner"\n',
                 'where = "text:0"\nstatus = "claim:times-two"\n')
            self.assertEqual(rules(content), ["field-invalid"])

    def test_a_sentence_may_not_have_two_entries(self) -> None:
        with content_copy() as content:
            ledger = content / LEDGER
            first = ledger.read_text().split("\n\n")[0] + "\n"
            ledger.write_text(ledger.read_text() + "\n" + first)
            self.assertEqual(rules(content), ["field-invalid"])


class Backing(unittest.TestCase):
    def test_advice_backs_a_remember_bullet(self) -> None:
        with content_copy() as content:
            edit(content, LEDGER, 'where = "remember:0"\nstatus = "claim:times-two"',
                 'where = "remember:0"\nstatus = "advice"')
            self.assertEqual(rules(content), [])

    def test_a_docs_link_backs_a_remember_bullet_only_with_a_reason(self) -> None:
        with content_copy() as content:
            edit(content, LEDGER, 'where = "remember:0"\nstatus = "claim:times-two"',
                 'where = "remember:0"\nstatus = "doc:https://docs.python.org/3/library/functions.html#len"')
            self.assertEqual(rules(content), ["remember-unbacked"])
            edit(content, LEDGER, 'functions.html#len"', 'functions.html#len"\nno_claim = "no claim can run it"')
            self.assertEqual(rules(content), [])

    def test_a_remember_bullet_with_no_entry_is_unbacked_not_missing(self) -> None:
        with content_copy() as content:
            edit(content, LESSON, 'remember = ["Multiplying by 2 doubles a number."]',
                 'remember = ["Multiplying by 2 doubles a number.", "Doubling twice quadruples."]')
            self.assertEqual(rules(content), ["remember-unbacked"])

    def test_a_docs_link_in_the_inventory_is_fine(self) -> None:
        with content_copy() as content:
            edit(content, LEDGER, 'where = "text:0"\nstatus = "claim:times-two"',
                 'where = "text:0"\nstatus = "doc:https://docs.python.org/3/library/functions.html#len"')
            self.assertEqual(rules(content), [])

    def test_a_simplification_needs_its_reason(self) -> None:
        with content_copy() as content:
            edit(content, LEDGER, 'where = "text:0"\nstatus = "claim:times-two"',
                 'where = "text:0"\nstatus = "simplification"')
            self.assertEqual(rules(content), ["field-invalid"])

    def test_a_claim_id_may_not_repeat(self) -> None:
        with content_copy() as content:
            again = "```python claim id=times-two\nassert 1 + 1 == 2\n```\n\n::task double"
            edit(content, LESSON, "::task double", again)
            self.assertEqual(rules(content), ["claim-id-duplicate"])

    def test_boss_text_cannot_point_to_a_claim(self) -> None:
        with content_copy() as content:
            edit(content, "w1/a/boss/ledger.toml", 'status = "not-a-fact"', 'status = "claim:x"')
            self.assertEqual(rules(content), ["claim-id-unknown"])


class Pending(unittest.TestCase):
    def test_pending_lists_sentences_with_their_paragraph_and_file(self) -> None:
        with content_copy() as content:
            edit(content, LESSON, "Numbers can be multiplied.", "Numbers can be multiplied. They can be added too.")
            found, _ = load_content(content)
            [pending] = pending_sentences(found)
        self.assertEqual((pending["text"], pending["file"], pending["where"], pending["item"]),
                         ("They can be added too.", LESSON, "text:0", "basics"))
        self.assertEqual(pending["paragraph"], "Numbers can be multiplied. They can be added too.")

    def test_pending_cli_writes_the_list(self) -> None:
        root = Path(__file__).resolve().parent.parent
        with content_copy() as content:
            edit(content, LESSON, "Numbers can be multiplied.", "Numbers can be multiplied. And more.")
            out = content.parent / "pending.json"
            subprocess.run([sys.executable, "-m", "tools.vet.pending", str(out), "--content", str(content)],
                           cwd=root, check=True, capture_output=True, timeout=60)
            self.assertEqual([p["text"] for p in json.loads(out.read_text())], ["And more."])


if __name__ == "__main__":
    unittest.main()
