"""Required constructs: the rules around `requires`, and Check refusing a solution that lacks one."""

import unittest
from pathlib import Path

from test_vet_progression import content_copy
from vet import vet

RULES = frozenset({"required-untaught", "required-not-in-prompt", "prompt-asks-construct", "unknown-feature",
                   "field-missing", "solution-fails"})
LAMBDA = ('\n[feature.lambda]\nsummary = "lambda"\ndetect = ["node:Lambda"]\nwords = ["lambda"]\n'
          'say = "use a lambda"\n')


def set_up(content: Path, *, requires: bool, teach: bool = True, mention: bool = True, say: bool = True,
           words_ok: str | None = None) -> None:
    with (content / "features.toml").open("a") as vocabulary:
        vocabulary.write(LAMBDA if say else LAMBDA.replace('say = "use a lambda"\n', ""))
    lesson = content / "w1/a/basics/lesson.md"
    if teach:
        lesson.write_text(lesson.read_text().replace('"fn-sum"]', '"fn-sum", "lambda"]'))
    toml = content / "w1/a/basics/tasks/double/task.toml"
    text = toml.read_text()
    if mention:
        text = text.replace("Write `double(n)`.", "Write `double(n)` as a lambda.")
    head = ('requires = ["lambda"]\n' if requires else "") + (f'construct_words_ok = "{words_ok}"\n' if words_ok else "")
    toml.write_text(head + text)


def rules(content: Path) -> list[str]:
    return sorted(f.rule for f in vet(content, only=RULES))


class Requires(unittest.TestCase):
    def test_a_taught_and_named_construct_is_fine(self) -> None:
        with content_copy() as content:
            set_up(content, requires=True)
            (content / "w1/a/basics/tasks/double/solution.py").write_text(
                "def double(n):\n    return (lambda x: x * 2)(n)\n")
            self.assertEqual(rules(content), [])

    def test_a_solution_without_the_construct_fails(self) -> None:
        with content_copy() as content:
            set_up(content, requires=True)
            [found] = vet(content, only=RULES)
        self.assertEqual(found.rule, "solution-fails")
        self.assertIn("this task asks you to use a lambda", found.message)

    def test_a_construct_no_lesson_teaches_is_untaught(self) -> None:
        with content_copy() as content:
            set_up(content, requires=True, teach=False)
            self.assertIn("required-untaught", rules(content))

    def test_a_prompt_must_name_what_it_requires(self) -> None:
        with content_copy() as content:
            set_up(content, requires=True, mention=False)
            self.assertIn("required-not-in-prompt", rules(content))

    def test_a_required_feature_needs_something_to_say(self) -> None:
        with content_copy() as content:
            set_up(content, requires=True, say=False)
            self.assertIn("field-missing", rules(content))

    def test_requiring_an_unlisted_feature_is_unknown(self) -> None:
        with content_copy() as content:
            toml = content / "w1/a/basics/tasks/double/task.toml"
            toml.write_text('requires = ["no-such-feature"]\n' + toml.read_text())
            self.assertEqual(rules(content), ["unknown-feature"])


class UnrequiredWords(unittest.TestCase):
    def test_naming_a_construct_without_requiring_it_is_flagged(self) -> None:
        with content_copy() as content:
            set_up(content, requires=False)
            self.assertEqual(rules(content), ["prompt-asks-construct"])

    def test_a_reason_silences_it(self) -> None:
        with content_copy() as content:
            set_up(content, requires=False, words_ok="the prompt only explains the word")
            self.assertEqual(rules(content), [])


if __name__ == "__main__":
    unittest.main()
