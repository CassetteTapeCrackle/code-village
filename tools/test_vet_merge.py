"""Merging the two reviews: what is accepted into a ledger and what goes to the owner."""

import tempfile
import unittest
from pathlib import Path

from test_vet_progression import content_copy
from vet import vet
from vet.ledger import parse_ledger
from vet.load import load_content
from vet.models.merge_sentences import LedgerUnreadable, Merged, insert_claim, merge, write
from vet.models.reply import Reply
from vet.prose import pending_sentences, sentence_fingerprint
from vet.python.adapter import PythonAdapter

SENTENCE = "Doubling twice gives four times the number."
FP = sentence_fingerprint(SENTENCE)
LESSON = "w1/a/basics/lesson.md"
RULES = frozenset({"ledger-missing", "ledger-stale", "claim-id-unknown", "claim-id-missing", "remember-unbacked"})
PASSING = "assert 2 * 2 * 5 == 20"


def reply(status: str = "claim", verdict: str = "true", assertion: str | None = PASSING,
          why: str = "it holds") -> Reply:
    return Reply(FP, status, verdict, why, assertion if status == "claim" else None)


def with_new_sentence(content: Path) -> None:
    path = content / LESSON
    first = "Numbers can be multiplied.\n"
    path.write_text(path.read_text().replace(first, f"{first}\n{SENTENCE}\n"))


def run_merge(content: Path, deepseek: Reply | None, claude: Reply | None) -> Merged:
    return merge(content, {FP: deepseek} if deepseek else {}, {FP: claude} if claude else {}, PythonAdapter())


class Accepting(unittest.TestCase):
    def test_accepted_fact_gets_claim_block(self) -> None:
        with content_copy() as content:
            with_new_sentence(content)
            merged = run_merge(content, reply(), reply())
            write(merged, content.parent / "triage.md")
            [entry] = parse_ledger((content / "w1/a/basics/ledger.toml").read_text())[0][-1:]
            lesson = (content / LESSON).read_text()
            findings = vet(content, only=RULES)
        self.assertEqual((entry.fp, entry.status, entry.decided, entry.deepseek, entry.claude),
                         (FP, f"claim:auto-{FP}", "auto", "agree", "agree"))
        self.assertIn(f"{SENTENCE}\n\n```python claim id=auto-{FP}\n{PASSING}\n```\n", lesson)
        self.assertEqual(findings, [])

    def test_a_claim_block_keeps_the_task_fingerprints(self) -> None:
        # blind-solver runs and gaps are pinned to these; a hidden claim must not make them stale
        with content_copy() as content:
            with_new_sentence(content)
            before = {item.id: item.fingerprint for item in load_content(content)[0].items()}
            write(run_merge(content, reply(), reply()), content.parent / "triage.md")
            after = {item.id: item.fingerprint for item in load_content(content)[0].items()}
        self.assertTrue(before)
        self.assertEqual(before, after)

    def test_advice_is_accepted_without_a_claim_block(self) -> None:
        with content_copy() as content:
            with_new_sentence(content)
            merged = run_merge(content, reply("advice"), reply("advice"))
        self.assertEqual(merged.claims, [])
        [[entry]] = merged.entries.values()
        self.assertEqual((entry.status, entry.decided), ("advice", "auto"))

    def test_a_simplification_keeps_the_reviewers_reason(self) -> None:
        with content_copy() as content:
            with_new_sentence(content)
            merged = run_merge(content, reply("simplification"), reply("simplification", why="ignores overflow"))
        [[entry]] = merged.entries.values()
        self.assertEqual(entry.reason, "ignores overflow")

    def test_a_docs_link_must_be_in_the_inventory(self) -> None:
        url = "doc:https://docs.python.org/3/library/functions.html#"
        with content_copy() as content:
            with_new_sentence(content)
            good = run_merge(content, reply(url + "len"), reply(url + "len"))
            bad = run_merge(content, reply(url + "nope"), reply(url + "nope"))
        self.assertEqual((len(good.entries), len(bad.triage)), (1, 1))
        self.assertIn("inventory", bad.triage[0])


class Triage(unittest.TestCase):
    def test_disagreement_goes_to_triage(self) -> None:
        with content_copy() as content:
            with_new_sentence(content)
            before = (content / LESSON).read_text()
            merged = run_merge(content, reply(), reply(verdict="false", why="four times only for two doublings"))
            write(merged, content.parent / "triage.md")
            triage = (content.parent / "triage.md").read_text()
            after = (content / LESSON).read_text()
        self.assertEqual(merged.entries, {})
        self.assertEqual(before, after)
        self.assertIn(f"> {SENTENCE}", triage)
        self.assertIn("claude: false, claim. four times only for two doublings", triage)
        self.assertIn("deepseek: true, claim", triage)

    def test_agreement_with_failing_assert_goes_to_triage(self) -> None:
        with content_copy() as content:
            with_new_sentence(content)
            merged = run_merge(content, reply(), reply(assertion="assert 2 * 2 == 5"))
        self.assertEqual(merged.entries, {})
        self.assertIn("claude's proposed assert failed: AssertionError", merged.triage[0])
        self.assertIn("assert 2 * 2 == 5", merged.triage[0])

    def test_different_backing_goes_to_triage(self) -> None:
        with content_copy() as content:
            with_new_sentence(content)
            merged = run_merge(content, reply("advice"), reply("not-a-fact"))
        self.assertIn("different backing", merged.triage[0])

    def test_boss_text_cannot_hold_a_claim(self) -> None:
        with content_copy() as content:
            boss = content / "w1/a/boss/boss.md"
            intro = "Build a tiny calculator."
            boss.write_text(boss.read_text().replace(intro, f"{intro} {SENTENCE}"))
            merged = run_merge(content, reply(), reply())
        self.assertIn("boss text has no claim blocks", merged.triage[0])

    def test_one_family_alone_waits(self) -> None:
        with content_copy() as content:
            with_new_sentence(content)
            merged = run_merge(content, reply(), None)
        self.assertEqual((merged.entries, merged.triage, merged.waiting), ({}, [], 1))

    def test_a_sentence_is_triaged_once_however_often_it_is_merged(self) -> None:
        with content_copy() as content:
            with_new_sentence(content)
            merged = run_merge(content, reply(), reply(verdict="unsure"))
            triage = Path(tempfile.mkdtemp()) / "triage.md"
            write(merged, triage)
            write(merged, triage)
            text = triage.read_text()
        self.assertEqual(text.count(f"fp:{FP}"), 1)


class Inserting(unittest.TestCase):
    def test_a_claim_follows_its_paragraph_only(self) -> None:
        lesson = "Intro.\n\nFirst paragraph. Second sentence.\nStill the same paragraph.\n\nNext one.\n\n::task a\n"
        paragraph = "First paragraph. Second sentence. Still the same paragraph."
        sentence = {"fp": "ab", "where": "text:1", "paragraph": paragraph}
        self.assertEqual(insert_claim(lesson, sentence, "assert True"),
                         "Intro.\n\nFirst paragraph. Second sentence.\nStill the same paragraph.\n\n"
                         "```python claim id=auto-ab\nassert True\n```\n\nNext one.\n\n::task a\n")

    def test_the_front_matter_is_never_the_place(self) -> None:
        lesson = '+++\nid = "x"\nremember = ["Lists are ordered."]\n+++\n\nLists are ordered.\n\n::task a\n'
        sentence = {"fp": "ef", "where": "text:0", "paragraph": "Lists are ordered."}
        found = insert_claim(lesson, sentence, "assert True")
        header = '+++\nid = "x"\nremember = ["Lists are ordered."]\n+++\n\nLists are ordered.\n\n'
        self.assertTrue(found.startswith(header + "```python claim"))
        self.assertEqual(found.count("```python claim"), 1)

    def test_a_sentence_outside_the_text_puts_its_claim_at_the_end(self) -> None:
        lesson = "Intro.\n\n::task a\n"
        sentence = {"fp": "cd", "where": "remember:0", "paragraph": "Remember this."}
        ends = "::task a\n\n```python claim id=auto-cd\nassert True\n```\n"
        self.assertTrue(insert_claim(lesson, sentence, "assert True").endswith(ends))


class Writing(unittest.TestCase):
    def test_a_ledger_that_cannot_be_read_whole_is_not_rewritten(self) -> None:
        with content_copy() as content:
            with_new_sentence(content)
            ledger = content / "w1/a/basics/ledger.toml"
            ledger.write_text(ledger.read_text().replace('decided = "owner"', 'decided = "maybe"', 1))
            before = ledger.read_text()
            merged = run_merge(content, reply(), reply())
            with self.assertRaises(LedgerUnreadable):
                write(merged, content.parent / "triage.md")
            self.assertEqual(ledger.read_text(), before)


class Pending(unittest.TestCase):
    def test_the_new_sentence_is_the_only_one_pending(self) -> None:
        with content_copy() as content:
            with_new_sentence(content)
            found, _ = load_content(content)
            self.assertEqual([p["fp"] for p in pending_sentences(found)], [FP])


if __name__ == "__main__":
    unittest.main()
