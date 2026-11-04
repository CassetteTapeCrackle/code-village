"""Blind solvers: DeepSeek solves a task from what a learner has seen, never the tests or the solution (spec 12).

Each item gets five attempts at temperatures 0.2, 0.6, 1.0, 0.6 and 0.2 over two phrasings of the question. This
module only asks for code; the attempts are run, never trusted, by tools/vet/blind_eval.py in the session. It runs
inside GitHub Actions through the vet-models job (`job = "blind"`), so it uses the standard library only.
"""

import json
import re
import time
from collections.abc import Mapping, Sequence
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from .deepseek import CapReached, DeepSeek, DeepSeekError, Message, settings_from_env

ATTEMPTS = ((0.2, 0), (0.6, 1), (1.0, 0), (0.6, 1), (0.2, 0))  # (temperature, phrasing)
WORKERS = 8
SYSTEM = (
    "You write Python code for exercises in a beginner course. Answer with one JSON object and nothing else: "
    '{"code": "<the complete contents of the file>"}. The code runs on Python 3.12 or newer, with NumPy, pandas and '
    "scikit-learn available. Use only what the course text shows so far."
)
PHRASINGS = (
    "Here is the course so far, then the exercise and the file you start from.\n\n{context}\n\n"
    "## Exercise\n{prompt}\n\n## Starting file\n```python\n{starter}\n```\n\nWrite the complete file that solves it.",
    "You are a student who has just read this part of the course:\n\n{context}\n\nYour exercise: {prompt}\n\n"
    "The editor holds this starting code:\n\n{starter}\n\nReply with the finished code for the whole file.",
)
FENCE = re.compile(r"```(?:python)?\n(.*?)```", re.S)


def extract_code(reply: str) -> str | None:
    """The code in a reply: the `code` of a JSON object, else the first Markdown fence, else nothing."""
    try:
        data = json.loads(re.sub(r"^```(?:json)?\s*|\s*```$", "", reply.strip()))
    except json.JSONDecodeError:
        data = None
    if isinstance(data, dict) and isinstance(data.get("code"), str) and data["code"].strip():
        return str(data["code"])
    fenced = FENCE.search(reply)
    return fenced.group(1) if fenced and fenced.group(1).strip() else None


def question(item: Mapping[str, str], phrasing: int) -> str:
    return PHRASINGS[phrasing].format(context=item["context"], prompt=item["prompt"], starter=item["starter"])


def attempt_once(client: DeepSeek, item: Mapping[str, str], temperature: float, phrasing: int) -> dict[str, object]:
    base: dict[str, object] = {"temperature": temperature, "phrasing": phrasing}
    try:
        raw, tokens = client.chat([Message("system", SYSTEM), Message("user", question(item, phrasing))],
                                  temperature=temperature)
    except CapReached:
        return {**base, "code": "", "tokens": 0, "error": "the call cap was reached"}
    except DeepSeekError as e:
        return {**base, "code": "", "tokens": 0, "error": f"the call failed: {e}"}
    code = extract_code(raw)
    return {**base, "code": code or "", "tokens": tokens, "error": None if code else "the reply held no code"}


def solve(items: Sequence[Mapping[str, str]], client: DeepSeek) -> dict[str, object]:
    """Five attempts per item, in order, and what the run cost."""
    started = time.monotonic()
    work = [(item, temperature, phrasing) for item in items for temperature, phrasing in ATTEMPTS]
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        done = list(pool.map(lambda w: attempt_once(client, *w), work))
    per_item = len(ATTEMPTS)
    solved = [{"id": item["id"], "fingerprint": item["fingerprint"],
               "attempts": done[at * per_item:(at + 1) * per_item]} for at, item in enumerate(items)]
    failed = sum(bool(a["error"]) for a in done)
    tokens = sum(int(str(a["tokens"])) for a in done)
    return {"model": client.settings.model, "calls": client.cap.used, "tokens": tokens, "failed": failed,
            "seconds": round(time.monotonic() - started, 1), "items": solved}


def run_file(request: Mapping[str, object], target: Path) -> dict[str, object]:
    items = request.get("items")
    if not isinstance(items, list) or not all(isinstance(i, dict) for i in items):
        raise DeepSeekError("a blind request needs an `items` list")
    client = DeepSeek(settings_from_env())
    client.check_model()
    result = solve(items, client)
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    return result
