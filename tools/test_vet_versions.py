"""The versions check: content must hold on Python 3.12 and 3.13 unless it declares min and says so."""

import shutil
import tempfile
import unittest
from pathlib import Path

from test_canaries import CANARIES, FIXTURES, materialize
from vet import vet
from vet.python.interpreters import interpreter, pins

RULES = frozenset({"version-differs", "min-unexplained"})
# str.replace takes count by keyword only from Python 3.13 on
NEEDS_313 = 'def double(n):\n    return int(str(n * 2).replace("_", "", count=1))\n'


def good_copy() -> Path:
    content = Path(tempfile.mkdtemp()) / "content"
    shutil.copytree(FIXTURES / "good", content)
    return content


def found(content: Path) -> list[tuple[str, str]]:
    return sorted((f.rule, f.item) for f in vet(content, only=RULES))


class Blocks(unittest.TestCase):
    def test_min_named_in_the_text_silences_both_rules(self) -> None:
        content = materialize(CANARIES / "min-unexplained" / "min-without-text", Path(tempfile.mkdtemp()))
        lesson = content / "w1/a/basics/lesson.md"
        lesson.write_text(lesson.read_text().replace("```python predict min=3.13", "From Python 3.13 on, docstrings "
                                                     "lose their indentation.\n\n```python predict min=3.13"))
        self.assertEqual(found(content), [])


class Items(unittest.TestCase):
    def setUp(self) -> None:
        self.content = good_copy()
        self.task = self.content / "w1/a/basics/tasks/double"
        (self.task / "solution.py").write_text(NEEDS_313)

    def declare(self, prompt: str) -> None:
        toml = self.task / "task.toml"
        text = toml.read_text().replace('prompt = "Write `double(n)`."', f'prompt = "{prompt}"')
        toml.write_text(text.replace("strict = true", 'strict = true\nmin = "3.13"'))

    def test_a_solution_that_fails_on_312_differs(self) -> None:
        [finding] = [f for f in vet(self.content, only=RULES)]
        self.assertEqual((finding.rule, finding.item), ("version-differs", "basics-double"))
        self.assertIn("the solution passes the tests of basics-double on Python 3.14 but fails on Python 3.12",
                      finding.message)

    def test_a_declared_and_named_min_passes(self) -> None:
        self.declare("Write `double(n)`. It needs Python 3.13.")
        self.assertEqual(found(self.content), [])

    def test_a_min_the_prompt_never_names_is_unexplained(self) -> None:
        self.declare("Write `double(n)`.")
        self.assertEqual(found(self.content), [("min-unexplained", "basics-double")])

    def test_a_min_that_is_not_a_supported_python_is_invalid(self) -> None:
        toml = self.task / "task.toml"
        toml.write_text(toml.read_text().replace("strict = true", 'strict = true\nmin = "3.9"'))
        self.assertIn(("field-invalid", "basics/double"), [(f.rule, f.item) for f in vet(self.content)])


class Interpreters(unittest.TestCase):
    def test_pins_come_from_pnpm_content(self) -> None:
        self.assertEqual(pins(), ["numpy==2.4.6", "pandas==3.0.2", "scikit-learn==1.8.0"])

    def test_each_older_python_runs_with_the_pins(self) -> None:
        python = interpreter("3.12")
        self.assertTrue(python.is_file())
        self.assertEqual(interpreter("3.12"), python)


if __name__ == "__main__":
    unittest.main()
