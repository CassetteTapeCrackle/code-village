"""Sentences, their fingerprints, and the ledger file format."""

import unittest
import zlib

from vet.ledger import LedgerEntry, doc_anchor_known, dump_ledger, parse_inventory, parse_ledger
from vet.prose import paragraphs, sentence_fingerprint, sentences, split_sentences


class Splitting(unittest.TestCase):
    def test_split_keeps_inline_code(self) -> None:
        text = "Use `x.y. z` here. Then `a!` works? Yes."
        self.assertEqual(split_sentences(text), ["Use `x.y. z` here.", "Then `a!` works?", "Yes."])

    def test_eg_does_not_split(self) -> None:
        self.assertEqual(split_sentences("Pick one (e.g. a list) or another, i.e. a tuple. Done."),
                         ["Pick one (e.g. a list) or another, i.e. a tuple.", "Done."])

    def test_a_digit_before_the_dot_does_not_end_a_sentence(self) -> None:
        found = split_sentences("Python 3. Next comes 2.5 seconds. Go.")
        self.assertEqual(found, ["Python 3. Next comes 2.5 seconds.", "Go."])

    def test_closing_quote_stays_with_its_sentence(self) -> None:
        self.assertEqual(split_sentences('She said "stop." Then left.'), ['She said "stop."', "Then left."])

    def test_text_without_a_stop_is_one_sentence(self) -> None:
        self.assertEqual(split_sentences("No stop here"), ["No stop here"])

    def test_code_fences_are_dropped_and_lists_split(self) -> None:
        markdown = "First line\nsecond line.\n\n```text\nprint(1). 2.\n```\n\n- one. two.\n- three\n\n# Title"
        self.assertEqual(paragraphs(markdown), ["First line second line.", "one. two.", "three", "Title"])


class Fingerprints(unittest.TestCase):
    def test_fingerprint_ignores_spacing(self) -> None:
        self.assertEqual(sentence_fingerprint("A  list\nholds   items."), sentence_fingerprint("a list holds items."))

    def test_editing_one_word_changes_it(self) -> None:
        self.assertNotEqual(sentence_fingerprint("A list holds items."), sentence_fingerprint("A list holds item."))

    def test_sentences_carry_where_and_fingerprint(self) -> None:
        [first, second] = sentences("One. Two.", "text:3")
        self.assertEqual((first.text, first.where, first.fingerprint), ("One.", "text:3", sentence_fingerprint("One.")))
        self.assertEqual(second.text, "Two.")


class LedgerFile(unittest.TestCase):
    ENTRY = LedgerEntry("0123456789ab", 'A "quoted" line\nwith a newline', "text:0", "claim:x", "r", "agree", "agree",
                        "auto")

    def test_a_ledger_reads_back_what_was_written(self) -> None:
        text = dump_ledger([self.ENTRY, LedgerEntry("ba9876543210", "Go.", "text:1", "not-a-fact")])
        entries, problems = parse_ledger(text)
        self.assertEqual((entries[0], problems), (self.ENTRY, []))
        self.assertEqual(entries[1].status, "not-a-fact")

    def test_problems_are_named(self) -> None:
        _, problems = parse_ledger('[[sentence]]\nfp = "a"\ntext = "t"\nwhere = "w"\nstatus = "simplification"\n'
                                   '[[sentence]]\nfp = "b"\ntext = "t"\nwhere = "w"\nstatus = "maybe"\n'
                                   '[[sentence]]\nfp = "c"\n')
        self.assertEqual(len(problems), 3)
        self.assertIn("needs a reason", problems[0])
        self.assertIn("must be claim:<id>", problems[1])
        self.assertIn("needs fp, text, where and status", problems[2])

    def test_a_broken_file_gives_no_entries(self) -> None:
        self.assertEqual(parse_ledger("[[sentence")[0], [])


class Inventory(unittest.TestCase):
    DATA = (b"# Sphinx inventory version 2\n# Project: Python\n# Version: 3.12\n# zlib\n"
            + zlib.compress(b"len py:function 1 library/functions.html#$ -\n"
                            b"str.split py:method 1 library/stdtypes.html#str.split str.split\n"))

    def test_anchors_come_from_the_inventory(self) -> None:
        inventory = parse_inventory(self.DATA)
        self.assertTrue(doc_anchor_known("https://docs.python.org/3/library/functions.html#len", inventory))
        self.assertTrue(doc_anchor_known("https://docs.python.org/3/library/stdtypes.html#str.split", inventory))

    def test_unknown_anchors_and_other_sites_are_refused(self) -> None:
        inventory = parse_inventory(self.DATA)
        for url in ("https://docs.python.org/3/library/functions.html#nope",
                    "https://docs.python.org/3/library/functions.html",
                    "https://example.com/library/functions.html#len"):
            with self.subTest(url=url):
                self.assertFalse(doc_anchor_known(url, inventory))


if __name__ == "__main__":
    unittest.main()
