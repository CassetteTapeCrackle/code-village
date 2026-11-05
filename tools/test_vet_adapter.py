import contextlib
import io
import json
import shutil
import sys
import tempfile
import time
import tomllib
import unittest
from pathlib import Path
from unittest import mock

from vet import Finding, GapKey, run
from vet.adapter import LIMIT, CheckJob, FeatureQuery, ToolError
from vet.checks import style
from vet.load import load_content
from vet.python import adapter as python_adapter
from vet.python import capped
from vet.python.adapter import PythonAdapter
from vet.rules import RULES, SEVERITIES, RulesError, load_rules
from vet.run import CHECKS, UndeclaredRule, vet_content

TESTS = 'def test_double():\n    expect_equal(learner["double"](2), 4, "double(2)")\n'


class Check(unittest.TestCase):
    def test_check_passes_solution(self) -> None:
        [outcome] = PythonAdapter().check([CheckJob(code="def double(n):\n    return n * 2\n", tests=TESTS)])
        passed = {"name": "double", "passed": True, "message": "", "hidden": False}
        self.assertEqual(outcome, {"error": None, "results": [passed]})

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

    @unittest.skipUnless(sys.platform == "linux", "only Linux enforces the address space cap")
    def test_a_job_that_fills_memory_stops_early(self) -> None:
        start = time.monotonic()
        [outcome] = PythonAdapter().run(["xs = []\nwhile True:\n    xs.append(bytearray(10**7))\n"])
        self.assertLess(time.monotonic() - start, LIMIT / 2)
        assert outcome is not None
        self.assertIn("MemoryError", outcome["error"] or "")

    def test_harness_runs_uncapped_where_the_cap_is_refused(self) -> None:
        # macOS: setrlimit(RLIMIT_AS) raises ValueError, and every job used to crash with it
        job = {"mode": "run", "code": "print(6 * 7)", "inputs": []}
        out = io.StringIO()
        refused = ValueError("current limit exceeds maximum limit")
        with mock.patch("resource.setrlimit", side_effect=refused), \
                mock.patch("sys.stdin", io.StringIO(json.dumps(job))), contextlib.redirect_stdout(out):
            capped.main(str(python_adapter.HARNESS))
        self.assertEqual(json.loads(out.getvalue())["stdout"], "42\n")

    def test_cap_memory_says_when_the_platform_refuses(self) -> None:
        for error in (ValueError("refused"), OSError("refused")):
            with self.subTest(error=type(error).__name__), mock.patch("resource.setrlimit", side_effect=error):
                self.assertFalse(capped.cap_memory())

    def test_a_job_checked_before_is_not_run_again(self) -> None:
        adapter = PythonAdapter()
        job = CheckJob(code="def double(n):\n    return n * 2\n", tests=TESTS)
        first = adapter.check([job, job])
        with mock.patch.object(adapter, "_harness_all", side_effect=AssertionError("ran again")):
            self.assertEqual(adapter.check([job]), first[:1])

    def test_every_run_repeats_set_order_and_a_seed_can_change_it(self) -> None:
        code = "def order():\n    return list({str(n) for n in range(12)})\n"
        tests = "def test_order():\n    expect_equal(learner['order'](), EXPECTED, 'order()')\n"
        outcomes = PythonAdapter().check([CheckJob(code, tests.replace("EXPECTED", "[]"), hash_seed=seed)
                                          for seed in (0, 0, 1)])
        messages = [o["results"][0]["message"] if o else "" for o in outcomes]  # type: ignore[index]
        self.assertEqual(messages[0], messages[1])
        self.assertNotEqual(messages[0], messages[2])

    def test_features_come_from_the_harness_vocabulary(self) -> None:
        vocabulary = {"fn-len": ["call:len"], "for-loop": ["node:For"]}
        queries = [FeatureQuery("for x in []:\n    len(x)\n"), FeatureQuery("x = 1\n"), FeatureQuery("len([")]
        found = PythonAdapter().features(queries, vocabulary)
        self.assertEqual(found, [frozenset({"fn-len", "for-loop"}), frozenset(), frozenset()])

    def test_features_of_no_code_run_nothing(self) -> None:
        with mock.patch.object(PythonAdapter, "_harness_all", side_effect=AssertionError("ran")):
            self.assertEqual(PythonAdapter().features([], {}), [])

    def test_features_job_that_cannot_run_is_a_tool_error(self) -> None:
        with mock.patch.object(PythonAdapter, "_harness_all", return_value=[None]), self.assertRaises(ToolError):
            PythonAdapter().features([FeatureQuery("x = 1\n")], {})

    def test_mutants_come_from_the_python_operators(self) -> None:
        self.assertEqual([m.code for m in PythonAdapter().mutants("x = 1\n")], ["x = 2\n", "x = 0\n"])


class BrokenTool(unittest.TestCase):
    def test_a_broken_linter_keeps_the_other_findings(self) -> None:
        root = Path(tempfile.mkdtemp()) / "content"
        shutil.copytree(python_adapter.ROOT / "tools" / "fixtures" / "good", root)
        (root / "w1/a/basics/tasks/half/solution.py").write_text("def half(n):\n    return n\n")
        content, _ = load_content(root)
        with mock.patch.object(style, "_ruff", side_effect=ToolError("ruff is missing")):
            findings, broken = vet_content(content, PythonAdapter())
        self.assertEqual(([f.rule for f in findings], broken), (["solution-fails"], ["ruff is missing"]))


LOADER_RULES = {"boss-stage-count", "concept-unnamed", "field-invalid", "field-missing", "file-unreadable",
                "task-folder-missing", "task-unplaced", "world-id-mismatch"}


class PickedRules(unittest.TestCase):
    def setUp(self) -> None:
        self.content, _ = load_content(python_adapter.ROOT / "tools" / "fixtures" / "good")
        self.ran: list[str] = []

    def fake(self, name: str, rules: set[str], reports: str | None = None) -> run.Check:
        def ran(content: object, adapter: object) -> list[Finding]:
            self.ran.append(name)
            return [Finding(reports, "item", "0", "m", "p")] if reports else []
        return run.Check(ran, frozenset(rules))

    def test_only_the_checks_behind_the_asked_rules_run(self) -> None:
        checks = [self.fake("cheap", {"solution-fails"}), self.fake("slow", {"weak-tests"})]
        with mock.patch("vet.run.CHECKS", checks):
            vet_content(self.content, PythonAdapter(), frozenset({"solution-fails"}))
            vet_content(self.content, PythonAdapter())
        self.assertEqual(self.ran, ["cheap", "cheap", "slow"])

    def test_a_rule_missing_from_its_check_entry_fails(self) -> None:
        with mock.patch("vet.run.CHECKS", [self.fake("liar", {"solution-fails"}, reports="weak-tests")]), \
                self.assertRaisesRegex(UndeclaredRule, "weak-tests"):
            vet_content(self.content, PythonAdapter())

    def test_every_rule_belongs_to_a_check_or_the_loader(self) -> None:
        from_checks = set().union(*(check.rules for check in CHECKS))
        self.assertEqual(sorted(from_checks - RULES.keys()), [])
        self.assertEqual(sorted(RULES.keys() - from_checks), sorted(LOADER_RULES - from_checks))


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
