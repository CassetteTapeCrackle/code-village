import tempfile
import time
import tomllib
import unittest
from pathlib import Path
from unittest import mock

from vet import Finding, GapKey
from vet.adapter import CheckJob
from vet.python import adapter as python_adapter
from vet.python.adapter import PythonAdapter
from vet.rules import RULES, SEVERITIES, RulesError, load_rules

TESTS = 'def test_double():\n    expect_equal(learner["double"](2), 4, "double(2)")\n'


class Check(unittest.TestCase):
    def test_check_passes_solution(self) -> None:
        [outcome] = PythonAdapter().check([CheckJob(code="def double(n):\n    return n * 2\n", tests=TESTS)])
        self.assertEqual(outcome, {"error": None, "results": [{"name": "double", "passed": True, "message": ""}]})

    def test_check_reports_a_failing_test(self) -> None:
        [outcome] = PythonAdapter().check([CheckJob(code="def double(n):\n    return n\n", tests=TESTS)])
        assert outcome is not None
        self.assertFalse(outcome["results"][0]["passed"])
        self.assertIn("double(2) returned 2, expected 4", outcome["results"][0]["message"])

    def test_check_reports_timeout_as_none(self) -> None:
        with mock.patch.object(python_adapter, "LIMIT", 1):
            outcomes = PythonAdapter().check([CheckJob(code="while True:\n    pass\n", tests=TESTS)])
        self.assertEqual(outcomes, [None])

    def test_check_reports_a_crashed_harness(self) -> None:
        [outcome] = PythonAdapter().check([CheckJob(code="", tests="def test_x(:\n")])
        assert outcome is not None
        self.assertIn("the harness crashed", outcome["error"] or "")

    def test_check_runs_jobs_in_parallel(self) -> None:
        sleep = CheckJob(code="import time\ntime.sleep(1)\n", tests="def test_ok():\n    pass\n")
        start = time.monotonic()
        outcomes = PythonAdapter().check([sleep, sleep])
        self.assertLess(time.monotonic() - start, 1.8)
        self.assertEqual(len(outcomes), 2)

    def test_run_returns_output_and_error(self) -> None:
        printed, raised = PythonAdapter().run(["print(6 * 7)", "1 / 0"])
        self.assertEqual(printed, {"stdout": "42\n", "error": None})
        assert raised is not None
        self.assertIn("ZeroDivisionError", raised["error"] or "")

    def test_unbuilt_methods_say_so(self) -> None:
        with self.assertRaises(NotImplementedError):
            PythonAdapter().mutants("x = 1")


class Findings(unittest.TestCase):
    def test_finding_key_drops_message_and_path(self) -> None:
        finding = Finding(rule="solution-fails", item="a", fingerprint="0123", message="m", path="p")
        self.assertEqual(finding.key, GapKey(rule="solution-fails", item="a", fingerprint="0123"))


class Rules(unittest.TestCase):
    def test_rules_toml_has_severity_for_every_rule(self) -> None:
        self.assertTrue(RULES)
        for rule in RULES.values():
            self.assertIn(rule.severity, SEVERITIES, rule.id)
            self.assertTrue(rule.summary, rule.id)

    def test_unknown_severity_names_the_rule(self) -> None:
        path = Path(tempfile.mkdtemp()) / "rules.toml"
        path.write_text('[rule.x]\nsummary = "s"\nseverity = "bad"\n')
        with self.assertRaisesRegex(RulesError, "rule.x"):
            load_rules(path)

    def test_rules_file_parses_as_toml(self) -> None:
        self.assertIn("rule", tomllib.loads(python_adapter.ROOT.joinpath("vet", "rules.toml").read_text()))


if __name__ == "__main__":
    unittest.main()
