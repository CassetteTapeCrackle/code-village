"""The feature vocabulary and the progression rules, on copies of the good fixture."""

import shutil
import tempfile
import unittest
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from vet import vet
from vet.finding import Finding
from vet.load import load_content

GOOD = Path(__file__).resolve().parent / "fixtures" / "good"
RULES = frozenset({"untaught-feature", "unknown-feature", "teaches-missing", "field-invalid", "file-unreadable"})
CLASS_FEATURE = '\n[feature.class-def]\nsummary = "class"\ndetect = ["node:ClassDef"]\n'
CLASS_CODE = "class Tripler:\n    def go(self, n):\n        return n * 3\n"
SECOND_LESSON = """+++
id = "second"
title = "Second"
world = "w1"
region = "a"
order = {order}
concepts = ["numbers"]
{teaches}remember = ["Classes group code."]
[loot]
id = "second-coin"
name = "Second Coin"
+++

A class groups code.

```python example
{code}```
"""


@contextmanager
def content_copy() -> Iterator[Path]:
    with tempfile.TemporaryDirectory() as into:
        content = Path(into) / "content"
        shutil.copytree(GOOD, content)
        yield content


def findings(content: Path) -> list[Finding]:
    return vet(content, only=RULES)


def add_second_lesson(content: Path, order: int, teaches: str | None, code: str = CLASS_CODE) -> None:
    line = f"teaches = {teaches}\n" if teaches is not None else ""
    folder = content / "w1" / "a" / "second"
    folder.mkdir()
    (folder / "lesson.md").write_text(SECOND_LESSON.format(order=order, teaches=line, code=code))


def add_class_feature(content: Path) -> None:
    with (content / "features.toml").open("a") as vocabulary:
        vocabulary.write(CLASS_FEATURE)


class Progression(unittest.TestCase):
    def test_good_fixture_is_clean(self) -> None:
        with content_copy() as content:
            self.assertEqual(findings(content), [])

    def test_untaught_feature_names_the_lesson_that_teaches_it_later(self) -> None:
        with content_copy() as content:
            add_class_feature(content)
            add_second_lesson(content, order=2, teaches='["class-def"]', code="x = 1\n")
            (content / "w1/a/basics/tasks/triple/right/with-class.py").write_text(CLASS_CODE)
            [found] = findings(content)
        self.assertEqual(found.rule, "untaught-feature")
        self.assertIn("class-def in right/with-class.py (taught later, in w1/a/second)", found.message)

    def test_a_lesson_may_use_what_it_teaches_itself(self) -> None:
        with content_copy() as content:
            add_class_feature(content)
            add_second_lesson(content, order=2, teaches='["class-def"]')
            self.assertEqual(findings(content), [])

    def test_nothing_is_judged_after_the_first_lesson_without_teaches(self) -> None:
        with content_copy() as content:
            add_class_feature(content)
            add_second_lesson(content, order=2, teaches=None)
            self.assertEqual([f.rule for f in findings(content)], ["teaches-missing"])

    def test_an_unknown_feature_is_found_even_where_nothing_is_judged(self) -> None:
        with content_copy() as content:
            add_second_lesson(content, order=2, teaches=None, code="'ab'.title()\n")
            self.assertEqual(sorted(f.rule for f in findings(content)), ["teaches-missing", "unknown-feature"])

    def test_boss_is_judged_after_the_last_lesson_of_its_region(self) -> None:
        with content_copy() as content:
            add_class_feature(content)
            add_second_lesson(content, order=2, teaches='["class-def"]')
            (content / "w1/a/boss/right/with-class.py").write_text(CLASS_CODE)
            self.assertEqual(findings(content), [])

    def test_boss_code_is_judged_too(self) -> None:
        with content_copy() as content:
            add_class_feature(content)
            (content / "w1/a/boss/right/with-class.py").write_text(CLASS_CODE)
            [found] = findings(content)
        self.assertEqual((found.rule, found.item), ("untaught-feature", "calc"))

    def test_a_method_the_lesson_defines_is_not_a_feature(self) -> None:
        with content_copy() as content:
            add_class_feature(content)
            add_second_lesson(content, order=2, teaches='["class-def"]', code=CLASS_CODE + "Tripler().go(2)\n")
            self.assertEqual(findings(content), [])

    def test_code_in_a_hint_counts(self) -> None:
        with content_copy() as content:
            toml = content / "w1/a/basics/tasks/half/task.toml"
            toml.write_text(toml.read_text().replace('hints = ["Divide by 2."]', 'hints = ["Try `max(n, 1)`."]'))
            [found] = findings(content)
        self.assertEqual(found.rule, "unknown-feature")
        self.assertIn("hint 1 uses call:max", found.message)


class Vocabulary(unittest.TestCase):
    def problems(self, features_toml: str) -> list[str]:
        with content_copy() as content:
            (content / "features.toml").write_text(features_toml)
            _, loaded = load_content(content)
        return [f.message for f in loaded]

    def test_vocabulary_is_loaded(self) -> None:
        with content_copy() as content:
            loaded, _ = load_content(content)
        self.assertEqual(loaded.vocabulary["fn-sum"], ["call:sum"])

    def test_missing_vocabulary_is_reported(self) -> None:
        with content_copy() as content:
            (content / "features.toml").unlink()
            _, loaded = load_content(content)
        self.assertEqual([f.rule for f in loaded], ["file-unreadable"])

    def test_detector_needs_a_known_kind(self) -> None:
        [message] = self.problems('[feature.x]\nsummary = "x"\ndetect = ["builtin:len"]\n')
        self.assertIn("detector builtin:len must be <kind>:<name>", message)

    def test_a_detector_belongs_to_one_feature(self) -> None:
        text = '[feature.a]\nsummary = "a"\ndetect = ["call:len"]\n[feature.b]\nsummary = "b"\ndetect = ["call:len"]\n'
        [message] = self.problems(text)
        self.assertIn("detector call:len already belongs to feature a", message)

    def test_feature_needs_detectors(self) -> None:
        [message] = self.problems('[feature.a]\nsummary = "a"\ndetect = []\n')
        self.assertIn("detect needs a list of detector strings", message)

    def test_teaches_must_be_a_list_of_strings(self) -> None:
        with content_copy() as content:
            lesson = content / "w1/a/basics/lesson.md"
            lesson.write_text(lesson.read_text().replace('teaches = ["fn-print"', 'teaches = [1, "fn-print"'))
            _, loaded = load_content(content)
        self.assertEqual([f.rule for f in loaded], ["field-invalid"])


if __name__ == "__main__":
    unittest.main()
