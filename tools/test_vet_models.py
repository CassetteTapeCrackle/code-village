"""The model jobs: results through the job log, with no network and recorded responses."""

import base64
import contextlib
import io
import json
import tempfile
import unittest
import urllib.error
import urllib.request
from pathlib import Path

from vet.models.deepseek import (
    BACKOFF_SECONDS,
    CapReached,
    DeepSeek,
    DeepSeekError,
    Message,
    ModelMissing,
    Settings,
    settings_from_env,
)
from vet.models.logs import LogError, emit_files, extract_files
from vet.models.reply import parse_reply
from vet.models.review_sentences import review


def printed(folder: Path) -> str:
    out = io.StringIO()
    with contextlib.redirect_stdout(out):
        emit_files(folder)
    return out.getvalue()


class ResultsInTheLog(unittest.TestCase):
    def test_files_round_trip_through_a_log_with_timestamps(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            folder = Path(tmp)
            (folder / "sub").mkdir()
            (folder / "a.json").write_bytes(b'{"x": 1}\n')
            (folder / "sub" / "big.bin").write_bytes(bytes(range(256)) * 40)
            log = "".join(f"2026-11-03T23:54:20.4858874Z {line}\n" for line in printed(folder).splitlines())
        found = extract_files("﻿" + log)
        self.assertEqual(found, {"a.json": b'{"x": 1}\n', "sub/big.bin": bytes(range(256)) * 40})

    def test_a_changed_line_fails_the_checksum(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "a.json").write_bytes(b"data")
            log = printed(Path(tmp)).replace(base64.b64encode(b"data").decode(), base64.b64encode(b"dat4").decode())
        with self.assertRaisesRegex(LogError, "checksum"):
            extract_files(log)

    def test_a_cut_off_log_is_refused(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            (Path(tmp) / "a.json").write_bytes(b"data")
            log = printed(Path(tmp)).replace("VET-FILE-END a.json", "")
        with self.assertRaisesRegex(LogError, "not complete"):
            extract_files(log)


def completion(content: str, tokens: int = 10) -> bytes:
    return json.dumps({"choices": [{"message": {"content": content}}], "usage": {"total_tokens": tokens}}).encode()


GOOD_REPLY = json.dumps({"status": "claim", "verdict": "true", "reason": "sort() sorts in place.",
                         "assert": "x = [3, 1]\nx.sort()\nassert x == [1, 3]"})


class Fake:
    """A transport that answers from a list, one answer per call, and remembers the requests."""

    def __init__(self, *answers: bytes | Exception) -> None:
        self.answers = list(answers)
        self.requests: list[urllib.request.Request] = []

    def __call__(self, request: urllib.request.Request) -> bytes:
        self.requests.append(request)
        answer = self.answers.pop(0)
        if isinstance(answer, Exception):
            raise answer
        return answer


def client(transport: Fake, max_calls: int = 100, waits: list[float] | None = None) -> DeepSeek:
    sleeps = [] if waits is None else waits
    return DeepSeek(Settings("secret-key", "deepseek-flash", max_calls), transport, sleeps.append)


def http_error(code: int) -> urllib.error.HTTPError:
    return urllib.error.HTTPError("https://api.deepseek.com", code, "x", {}, None)  # type: ignore[arg-type]


class Replies(unittest.TestCase):
    def test_a_good_reply_is_kept(self) -> None:
        reply = parse_reply("fp1", GOOD_REPLY)
        self.assertEqual((reply.status, reply.verdict), ("claim", "true"))
        self.assertEqual(reply.as_json()["assert"], "x = [3, 1]\nx.sort()\nassert x == [1, 3]")

    def test_invalid_reply_becomes_unsure(self) -> None:
        for raw in ("not json", "[1]", json.dumps({"status": "maybe", "verdict": "true", "reason": "r"}),
                    json.dumps({"status": "advice", "verdict": "yes", "reason": "r"}),
                    json.dumps({"status": "advice", "verdict": "true", "reason": ""}),
                    json.dumps({"status": "claim", "verdict": "true", "reason": "r", "assert": None}),
                    json.dumps({"status": "doc:https://example.com/x#y", "verdict": "true", "reason": "r"}),
                    json.dumps({"status": "advice:extra", "verdict": "true", "reason": "r"})):
            with self.subTest(raw=raw):
                reply = parse_reply("fp1", raw)
                self.assertEqual((reply.verdict, reply.fp), ("unsure", "fp1"))

    def test_a_docs_url_is_a_valid_status(self) -> None:
        raw = json.dumps({"status": "doc:https://docs.python.org/3/library/functions.html#len", "verdict": "true",
                          "reason": "r", "assert": None})
        self.assertEqual(parse_reply("fp1", raw).verdict, "true")


class Calls(unittest.TestCase):
    def test_chat_returns_the_reply_and_asks_for_json(self) -> None:
        fake = Fake(completion("hello", 7))
        self.assertEqual(client(fake).chat([Message("user", "hi")], temperature=0.0), ("hello", 7))
        sent = json.loads(fake.requests[0].data or b"{}")
        self.assertEqual((sent["model"], sent["response_format"], sent["temperature"]),
                         ("deepseek-flash", {"type": "json_object"}, 0.0))
        self.assertEqual(fake.requests[0].get_header("Authorization"), "Bearer secret-key")

    def test_a_busy_service_is_retried_with_backoff(self) -> None:
        waits: list[float] = []
        fake = Fake(http_error(503), urllib.error.URLError("down"), completion("ok"))
        self.assertEqual(client(fake, waits=waits).chat([Message("user", "hi")], temperature=0.0)[0], "ok")
        self.assertEqual(waits, list(BACKOFF_SECONDS[:2]))

    def test_gives_up_after_three_retries(self) -> None:
        fake = Fake(*[http_error(500) for _ in range(4)])
        with self.assertRaisesRegex(DeepSeekError, "4 tries"):
            client(fake).chat([Message("user", "hi")], temperature=0.0)
        self.assertEqual(len(fake.requests), 4)

    def test_a_refused_request_is_not_retried(self) -> None:
        fake = Fake(http_error(401), completion("never"))
        with self.assertRaisesRegex(DeepSeekError, "401"):
            client(fake).chat([Message("user", "hi")], temperature=0.0)
        self.assertEqual(len(fake.requests), 1)

    def test_call_cap_stops(self) -> None:
        fake = Fake(completion("a"), completion("b"), completion("c"))
        capped = client(fake, max_calls=2)
        capped.chat([Message("user", "1")], temperature=0.0)
        capped.chat([Message("user", "2")], temperature=0.0)
        with self.assertRaises(CapReached):
            capped.chat([Message("user", "3")], temperature=0.0)
        self.assertEqual(len(fake.requests), 2)

    def test_missing_model_exits(self) -> None:
        listing = json.dumps({"data": [{"id": "deepseek-chat"}]}).encode()
        with self.assertRaisesRegex(ModelMissing, "deepseek-flash"):
            client(Fake(listing)).check_model()
        client(Fake(json.dumps({"data": [{"id": "deepseek-flash"}]}).encode())).check_model()

    def test_settings_come_from_the_environment(self) -> None:
        self.assertEqual(settings_from_env({"DEEPSEEK_API_KEY": "k"}), Settings("k", "deepseek-flash", 3000))
        self.assertEqual(settings_from_env({"DEEPSEEK_API_KEY": "k", "DEEPSEEK_MODEL": "m", "VET_MAX_CALLS": "5"}),
                         Settings("k", "m", 5))
        with self.assertRaises(DeepSeekError):
            settings_from_env({})


SENTENCES = [{"fp": f"fp{n}", "text": f"Sentence {n}.", "paragraph": f"Sentence {n}. More."} for n in range(3)]


class Reviewing(unittest.TestCase):
    def test_each_sentence_gets_a_reply_in_order(self) -> None:
        fake = Fake(*[completion(GOOD_REPLY, 5) for _ in range(3)])
        result = review(SENTENCES, client(fake), "PROMPT")
        replies = result["replies"]
        assert isinstance(replies, list)
        self.assertEqual([r["fp"] for r in replies], ["fp0", "fp1", "fp2"])
        self.assertEqual((result["calls"], result["tokens"], result["model"]), (3, 15, "deepseek-flash"))
        asked = json.loads(json.loads(fake.requests[0].data or b"{}")["messages"][1]["content"])
        self.assertEqual(asked, {"paragraph": "Sentence 0. More.", "sentence": "Sentence 0."})

    def test_a_failed_or_invalid_reply_is_unsure_not_a_crash(self) -> None:
        fake = Fake(completion("not json"), http_error(400), completion(GOOD_REPLY))
        replies = review(SENTENCES, client(fake), "PROMPT")["replies"]
        assert isinstance(replies, list)
        self.assertEqual(sorted(r["verdict"] for r in replies), ["true", "unsure", "unsure"])

    def test_sentences_past_the_cap_are_unsure(self) -> None:
        fake = Fake(completion(GOOD_REPLY))
        replies = review(SENTENCES, client(fake, max_calls=1), "PROMPT")["replies"]
        assert isinstance(replies, list)
        self.assertEqual(sorted(r["verdict"] for r in replies), ["true", "unsure", "unsure"])
        self.assertTrue(any("cap" in r["reason"] for r in replies))


if __name__ == "__main__":
    unittest.main()
