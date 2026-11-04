"""Blind solvers: the request, running the attempts, triage, and the rules over stored results."""

import json
import shutil
import tempfile
import unittest
from collections.abc import Iterator
from contextlib import contextmanager
from pathlib import Path

from test_vet_models import Fake, client, completion
from vet import vet
from vet.blind_eval import add_triage, build_request, evaluate, main
from vet.load import load_content
from vet.models.blind_solve import ATTEMPTS, PHRASINGS, extract_code, solve
from vet.python.adapter import PythonAdapter

FIXTURES = Path(__file__).resolve().parent / "fixtures"
RIGHT = "def double(n):\n    return n * 2\n"
WRONG = "def double(n):\n    return n + 2\n"
RULES = frozenset({"blind-missing", "blind-untriaged", "blind-too-strict", "blind-disagrees"})
CASE = "We also tried double(3): expected 6, your code returned 5."


@contextmanager
def blind_copy(attempts: list[dict[str, str]], triage: list[dict[str, object]] | None = None) -> Iterator[Path]:
    """blind-base copied beside a vet/blind folder holding one stored run for its only task."""
    with tempfile.TemporaryDirectory() as into:
        content = Path(into) / "content"
        shutil.copytree(FIXTURES / "blind-base", content)
        loaded, _ = load_content(content)
        folder = Path(into) / "vet" / "blind"
        folder.mkdir(parents=True)
        run = {"fingerprint": loaded.solution_groups()[0][0].fingerprint, "attempts": attempts, "triage": triage or []}
        (folder / "basics-double.json").write_text(json.dumps(run))
        yield content


def attempt(visible: str, hidden: str, fuzz: str = "none", **more: str) -> dict[str, str]:
    return {"code": RIGHT, "visible": visible, "hidden": hidden, "fuzz": fuzz, "failure": "", "case": "", "input": "",
            **more}


FAILING = attempt("fail", "fail", case=CASE)


class Request(unittest.TestCase):
    def test_the_solver_sees_the_lesson_the_prompt_and_the_starter_only(self) -> None:
        content, _ = load_content(FIXTURES / "good")
        [item] = build_request(content, ["basics-double"])["items"]  # type: ignore[misc]
        self.assertEqual(item["prompt"], "Write `double(n)`.")
        self.assertIn("Numbers can be multiplied.", item["context"])
        self.assertIn("print(2 * 21)", item["context"])
        self.assertNotIn("assert 2 * 21 == 42", item["context"])  # a claim is never shown
        self.assertEqual(item["starter"], (FIXTURES / "good/w1/a/basics/tasks/double/starter.py").read_text())
        everything = json.dumps(item)
        self.assertNotIn("n * 2", everything)  # the solution
        self.assertNotIn("expect_equal", everything)  # the tests

    def test_a_boss_is_asked_with_its_intro_and_every_stage_prompt(self) -> None:
        content, _ = load_content(FIXTURES / "good")
        [item] = build_request(content, ["calc"])["items"]  # type: ignore[misc]
        self.assertIn("Build a tiny calculator.", item["prompt"])
        self.assertIn("Stage 1: Write `add(a, b)`.", item["prompt"])

    def test_an_unknown_id_is_named(self) -> None:
        content, _ = load_content(FIXTURES / "good")
        with self.assertRaisesRegex(KeyError, "nope"):
            build_request(content, ["nope"])


ITEMS = [{"id": "a", "fingerprint": "f", "context": "c", "prompt": "p", "starter": "s"}]


class Asking(unittest.TestCase):
    def test_five_attempts_at_the_planned_temperatures_over_two_phrasings(self) -> None:
        fake = Fake(*[completion(json.dumps({"code": f"x = {n}"}), 3) for n in range(5)])
        result = solve(ITEMS, client(fake))
        sent = [json.loads(r.data or b"{}") for r in fake.requests]
        self.assertEqual(sorted(s["temperature"] for s in sent), sorted(t for t, _ in ATTEMPTS))
        self.assertEqual({m["messages"][1]["content"][:12] for m in sent},
                         {PHRASINGS[0][:12], PHRASINGS[1][:12]})
        [solved] = result["items"]  # type: ignore[misc]
        self.assertEqual([a["temperature"] for a in solved["attempts"]], [t for t, _ in ATTEMPTS])
        self.assertEqual((result["calls"], result["tokens"], result["failed"]), (5, 15, 0))

    def test_a_reply_without_code_is_an_error_not_a_crash(self) -> None:
        fake = Fake(*[completion("I cannot help") for _ in range(5)])
        [solved] = solve(ITEMS, client(fake))["items"]  # type: ignore[misc]
        self.assertTrue(all(a["error"] == "the reply held no code" for a in solved["attempts"]))

    def test_code_comes_from_json_or_a_fence(self) -> None:
        self.assertEqual(extract_code('{"code": "x = 1"}'), "x = 1")
        self.assertEqual(extract_code("Here:\n```python\nx = 2\n```\n"), "x = 2\n")
        self.assertIsNone(extract_code('{"code": "  "}'))
        self.assertIsNone(extract_code("nothing"))


class Running(unittest.TestCase):
    def raw(self, content_fp: str, attempts: list[dict[str, object]]) -> dict[str, object]:
        return {"model": "m", "items": [{"id": "basics-double", "fingerprint": content_fp, "attempts": attempts}]}

    def test_attempts_are_run_through_tests_cases_and_the_fuzz_set(self) -> None:
        content, _ = load_content(FIXTURES / "good")
        fp = next(g for g in content.solution_groups() if g[0].id == "basics-double")[0].fingerprint
        attempts = [{"temperature": 0.2, "code": RIGHT, "error": None},
                    {"temperature": 0.6, "code": WRONG, "error": None},
                    {"temperature": 1.0, "code": "", "error": "the call failed"}]
        result = evaluate(content, self.raw(fp, attempts), PythonAdapter())["basics-double"]
        right, wrong = result["attempts"]  # type: ignore[misc]
        self.assertEqual((right["visible"], right["hidden"], right["fuzz"]), ("pass", "pass", "agree"))
        self.assertEqual((wrong["visible"], wrong["hidden"]), ("fail", "fail"))
        self.assertIn("double(", wrong["case"])
        self.assertEqual(len(result["attempts"]), 2)  # the failed call is left out

    def test_an_old_request_is_refused(self) -> None:
        content, _ = load_content(FIXTURES / "good")
        with self.assertRaisesRegex(ValueError, "content changed"):
            evaluate(content, self.raw("000000000000", [{"temperature": 0.2, "code": RIGHT, "error": None}]),
                     PythonAdapter())


class Triage(unittest.TestCase):
    def found(self, content: Path) -> list[str]:
        return sorted(f.rule for f in vet(content, only=RULES))

    def test_a_failing_attempt_needs_a_decision(self) -> None:
        with blind_copy([FAILING]) as content:
            self.assertEqual(self.found(content), ["blind-untriaged"])

    def test_a_model_wrong_decision_that_quotes_the_case_settles_it(self) -> None:
        decision = {"attempt": 0, "decision": "model-wrong", "by": "owner", "note": f"The model forgot: {CASE}"}
        with blind_copy([FAILING], [decision]) as content:
            self.assertEqual(self.found(content), [])

    def test_a_model_wrong_decision_without_the_case_does_not(self) -> None:
        decision = {"attempt": 0, "decision": "model-wrong", "by": "session", "note": "it is wrong"}
        with blind_copy([FAILING], [decision]) as content:
            [finding] = vet(content, only=RULES)
        self.assertEqual(finding.rule, "blind-untriaged")
        self.assertIn("must quote the failing case", finding.message)

    def test_too_strict_cannot_be_triaged_away(self) -> None:
        strict = attempt("fail", "pass", failure="double: the result must be an int")
        decision = {"attempt": 0, "decision": "model-wrong", "by": "owner", "note": strict["failure"]}
        with blind_copy([strict], [decision]) as content:
            self.assertEqual(self.found(content), ["blind-too-strict"])

    def test_a_fuzz_disagreement_is_settled_by_a_decision(self) -> None:
        differs = attempt("pass", "pass", "differs", input="We also tried double(1000)")
        decision = {"attempt": 0, "decision": "solution-fixed", "by": "owner", "note": "the solution was wrong"}
        with blind_copy([differs]) as content:
            self.assertEqual(self.found(content), ["blind-disagrees"])
        with blind_copy([differs], [decision]) as content:
            self.assertEqual(self.found(content), [])

    def test_passing_attempts_are_quiet(self) -> None:
        with blind_copy([attempt("pass", "pass", "agree")] * 2) as content:
            self.assertEqual(self.found(content), [])

    def test_no_blind_folder_means_nothing_is_asked(self) -> None:
        self.assertEqual(self.found(FIXTURES / "good"), [])

    def test_triage_cli_quotes_the_case_and_lists_session_decisions(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            run = Path(tmp) / "basics-double.json"
            run.write_text(json.dumps({"attempts": [FAILING], "triage": []}))
            with self.assertRaisesRegex(ValueError, "quote the failing case"):
                add_triage(run, 0, "model-wrong", "session", "it is wrong")
            listing = Path(tmp) / "triage.md"
            main(["triage", "basics-double", "0", "model-wrong", "--note", CASE, "--dir", tmp,
                  "--triage-file", str(listing)])
            self.assertEqual(json.loads(run.read_text())["triage"][0]["decision"], "model-wrong")
            self.assertIn("blind: basics-double, attempt 0", listing.read_text())


if __name__ == "__main__":
    unittest.main()
