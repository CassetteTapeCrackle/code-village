"""inspections(): what in a tests.py reads the learner's code instead of running it."""

import unittest

from vet.checks.test_shape import inspections, keyword_arguments


class Inspections(unittest.TestCase):
    def test_each_way_of_reading_code_is_named(self) -> None:
        tests = ("import inspect\nfrom dis import dis\nimport json\n"
                 "def test_a():\n    learner['f'].__code__\n    open(__file__)\n    open('answer.py')\n"
                 "    Path('answer.py').read_text()\n")
        self.assertEqual(list(inspections(tests)), ["imports inspect", "imports from dis", "reads __code__",
                                                    "opens a source file", "opens a source file",
                                                    "opens a source file"])

    def test_a_learner_function_cannot_be_asked_its_name_or_docs(self) -> None:
        tests = ("def test_a():\n    assert learner['f'].__name__ == 'f'\n    assert learner['f'].__doc__\n"
                 "    assert learner['f'].__defaults__ is None\n")
        self.assertEqual(sorted(inspections(tests)), ["reads __defaults__ of the learner's code",
                                                      "reads __doc__ of the learner's code",
                                                      "reads __name__ of the learner's code"])

    def test_the_name_of_a_type_is_fine(self) -> None:
        self.assertEqual(list(inspections("def test_a():\n    assert type(1).__name__ == 'int'\n")), [])

    def test_keyword_arguments_to_the_learners_code_are_found(self) -> None:
        tests = "def test_a():\n    learner['f'](n=2, scale=3)\n    helper(x=1)\n    learner['G'](1).m(k=2)\n"
        self.assertEqual(keyword_arguments(tests), {"n", "scale"})
        self.assertEqual(keyword_arguments("def test_a(:\n"), set())

    def test_writing_a_data_file_is_fine(self) -> None:
        tests = "def test_a():\n    with open('scores.json', 'w') as f:\n        f.write('[]')\n    open(name)\n"
        self.assertEqual(list(inspections(tests)), [])

    def test_tests_that_do_not_parse_report_nothing_here(self) -> None:
        self.assertEqual(list(inspections("def test_a(:\n")), [])


if __name__ == "__main__":
    unittest.main()
