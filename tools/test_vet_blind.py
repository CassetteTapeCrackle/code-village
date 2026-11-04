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
from vet.blind_eval import add_triage, build_request, evaluate, main, stale_ids
from vet.checks.blind import ATTEMPTS_PER_ITEM, result_path
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
        padded = [*attempts, *[attempt("pass", "pass", "agree")] * (ATTEMPTS_PER_ITEM - len(attempts))]
        run = {"fingerprint": loaded.solution_groups()[0][0].fingerprint, "attempts": padded, "triage": triage or []}
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

    def test_attempts_stay_with_their_item_in_order(self) -> None:
        two = [{**ITEMS[0], "id": "a"}, {**ITEMS[0], "id": "b"}]
        fake = Fake(*[completion(json.dumps({"code": "x = 1"})) for _ in range(10)])
        result = solve(two, client(fake))
        self.assertEqual([i["id"] for i in result["items"]], ["a", "b"])  # type: ignore[attr-defined]
        self.assertTrue(all(len(i["attempts"]) == 5 for i in result["items"]))  # type: ignore[attr-defined]

    def test_the_check_and_the_solver_agree_on_five(self) -> None:
        self.assertEqual(ATTEMPTS_PER_ITEM, len(ATTEMPTS))

    def test_a_json_fence_is_stripped(self) -> None:
        self.assertEqual(extract_code('```json\n{"code": "x = 3"}\n```'), "x = 3")

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
        attempts = [{"temperature": t, "code": WRONG if at == 1 else RIGHT, "error": None}
                    for at, (t, _) in enumerate(ATTEMPTS)]
        result = evaluate(content, self.raw(fp, attempts), PythonAdapter())["basics-double"]
        right, wrong = result["attempts"][0], result["attempts"][1]  # type: ignore[index]
        self.assertEqual((right["visible"], right["hidden"], right["fuzz"]), ("pass", "pass", "agree"))
        self.assertEqual((wrong["visible"], wrong["hidden"]), ("fail", "fail"))
        self.assertIn("double(", wrong["case"])
        self.assertEqual(len(result["attempts"]), 5)  # type: ignore[arg-type]

    def test_code_that_cannot_load_fails_everything_and_is_not_too_strict(self) -> None:
        content, _ = load_content(FIXTURES / "good")
        fp = next(g for g in content.solution_groups() if g[0].id == "basics-double")[0].fingerprint
        broken = [{"temperature": t, "code": "def double(n:\n", "error": None} for t, _ in ATTEMPTS]
        result = evaluate(content, self.raw(fp, broken), PythonAdapter())["basics-double"]
        first = result["attempts"][0]  # type: ignore[index]
        self.assertEqual((first["visible"], first["hidden"]), ("fail", "fail"))
        self.assertIn("SyntaxError", first["failure"])

    def test_a_run_with_a_missing_attempt_is_not_written(self) -> None:
        content, _ = load_content(FIXTURES / "good")
        fp = next(g for g in content.solution_groups() if g[0].id == "basics-double")[0].fingerprint
        attempts = [{"temperature": t, "code": RIGHT, "error": None} for t, _ in ATTEMPTS]
        attempts[3] = {"temperature": 0.6, "code": "", "error": "the call failed"}
        self.assertEqual(evaluate(content, self.raw(fp, attempts), PythonAdapter()), {})

    def test_asking_again_keeps_the_triage_of_the_same_version(self) -> None:
        content, _ = load_content(FIXTURES / "good")
        fp = next(g for g in content.solution_groups() if g[0].id == "basics-double")[0].fingerprint
        attempts = [{"temperature": t, "code": RIGHT, "error": None} for t, _ in ATTEMPTS]
        with tempfile.TemporaryDirectory() as tmp:
            kept = {"attempt": 1, "decision": "test-fixed", "by": "owner", "note": "n"}
            (Path(tmp) / "basics-double.json").write_text(json.dumps({"fingerprint": fp, "triage": [kept]}))
            again = evaluate(content, self.raw(fp, attempts), PythonAdapter(), Path(tmp))
            self.assertEqual(again["basics-double"]["triage"], [kept])
            (Path(tmp) / "basics-double.json").write_text(json.dumps({"fingerprint": "old", "triage": [kept]}))
            other = evaluate(content, self.raw(fp, attempts), PythonAdapter(), Path(tmp))
            self.assertEqual(other["basics-double"]["triage"], [])

    def test_stale_items_are_those_without_a_current_run(self) -> None:
        content, _ = load_content(FIXTURES / "good")
        with tempfile.TemporaryDirectory() as tmp:
            self.assertEqual(stale_ids(content, Path(tmp), 2), ["basics-double", "basics-double-quadruple"])
            fp = next(g for g in content.solution_groups() if g[0].id == "basics-double")[0].fingerprint
            (Path(tmp) / "basics-double.json").write_text(json.dumps({"fingerprint": fp}))
            self.assertNotIn("basics-double", stale_ids(content, Path(tmp), 99))

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

    def test_a_thin_or_malformed_file_counts_as_missing_and_does_not_crash(self) -> None:
        for attempts in (["x"] * 5, [attempt("pass", "pass", "agree")], [attempt("skip", "pass", "agree")] * 5):
            with self.subTest(attempts=str(attempts)[:40]), blind_copy([]) as content:
                (content.parent / "vet/blind/basics-double.json").write_text(
                    json.dumps({"fingerprint": load_content(content)[0].solution_groups()[0][0].fingerprint,
                                "attempts": attempts}))
                self.assertEqual(self.found(content), ["blind-missing"])

    def test_one_invalid_decision_unsettles_the_attempt(self) -> None:
        good = {"attempt": 0, "decision": "model-wrong", "by": "owner", "note": CASE}
        bad = {"attempt": 0, "decision": "model-wrong", "by": "owner", "note": "no quote"}
        with blind_copy([FAILING], [good, bad]) as content:
            self.assertEqual(self.found(content), ["blind-untriaged"])

    def test_model_wrong_needs_a_quote_to_exist(self) -> None:
        nothing = attempt("fail", "fail")  # no case and no failure recorded
        decision = {"attempt": 0, "decision": "model-wrong", "by": "owner", "note": "whatever"}
        with blind_copy([nothing], [decision]) as content:
            self.assertEqual(self.found(content), ["blind-untriaged"])

    def test_an_item_id_must_be_a_plain_file_name(self) -> None:
        self.assertEqual(result_path(Path("vet/blind"), "w1-sign"), Path("vet/blind/w1-sign.json"))
        for bad in ("../x", "/etc/passwd", "a/b", ""):
            self.assertIsNone(result_path(Path("vet/blind"), bad))

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
