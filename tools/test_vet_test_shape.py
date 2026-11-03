"""inspections(): what in a tests.py reads the learner's code instead of running it."""

import unittest

from vet.checks.test_shape import inspections


class Inspections(unittest.TestCase):
    def test_each_way_of_reading_code_is_named(self) -> None:
        tests = ("import inspect\nfrom dis import dis\nimport json\n"
                 "def test_a():\n    learner['f'].__code__\n    open(__file__)\n    open('answer.py')\n"
                 "    Path('answer.py').read_text()\n")
        self.assertEqual(list(inspections(tests)), ["imports inspect", "imports from dis", "reads __code__",
                                                    "opens a source file", "opens a source file",
                                                    "opens a source file"])

    def test_writing_a_data_file_is_fine(self) -> None:
        tests = "def test_a():\n    with open('scores.json', 'w') as f:\n        f.write('[]')\n    open(name)\n"
        self.assertEqual(list(inspections(tests)), [])

    def test_tests_that_do_not_parse_report_nothing_here(self) -> None:
        self.assertEqual(list(inspections("def test_a(:\n")), [])


if __name__ == "__main__":
    unittest.main()
