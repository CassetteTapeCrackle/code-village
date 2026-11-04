"""Asks DeepSeek to review sentences: what backs each one, and whether it is true for Python 3.12 and newer.

python -m tools.vet.models.review_sentences --in pending.json --out vet/results/deepseek-sentences.json

The input is a list of {fp, text, where, paragraph} (python -m tools.vet.pending writes it). Each sentence gets one
call with the prompt in docs/test-framework/prompts/review-sentences.md. A reply that fails or does not fit the
schema becomes verdict "unsure". Runs inside GitHub Actions only (spec 12).
"""

import argparse
import json
import sys
import time
from collections.abc import Mapping, Sequence
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from .deepseek import CapReached, DeepSeek, DeepSeekError, Message, settings_from_env
from .reply import Reply, parse_reply, unsure

PROMPT = Path(__file__).resolve().parents[3] / "docs" / "test-framework" / "prompts" / "review-sentences.md"
WORKERS = 8  # calls in flight at once; the service allows many
TEMPERATURE = 0.0


def review_one(client: DeepSeek, prompt: str, sentence: Mapping[str, str]) -> tuple[Reply, int, bool]:
    """The reply, the tokens used, and whether the call itself worked (a bad reply is still a call that worked)."""
    fp = sentence["fp"]
    question = json.dumps({"paragraph": sentence["paragraph"], "sentence": sentence["text"]}, ensure_ascii=False)
    try:
        raw, tokens = client.chat([Message("system", prompt), Message("user", question)], temperature=TEMPERATURE)
    except CapReached:
        return unsure(fp, "the call cap was reached before this sentence"), 0, False
    except DeepSeekError as e:
        return unsure(fp, f"the call failed: {e}"), 0, False
    return parse_reply(fp, raw), tokens, True


def review(sentences: Sequence[Mapping[str, str]], client: DeepSeek, prompt: str) -> dict[str, object]:
    """One reply per sentence, in order, and what the run cost."""
    started = time.monotonic()
    with ThreadPoolExecutor(max_workers=WORKERS) as pool:
        done = list(pool.map(lambda sentence: review_one(client, prompt, sentence), sentences))
    return {"model": client.settings.model, "calls": client.cap.used, "tokens": sum(tokens for _, tokens, _ in done),
            "failed": sum(not worked for _, _, worked in done), "seconds": round(time.monotonic() - started, 1),
            "replies": [reply.as_json() for reply, _, _ in done]}


def mostly_failed(result: Mapping[str, object]) -> bool:
    """True when over half the sentences got no answer (a bad key, the cap, a service that is down)."""
    replies = result["replies"]
    return isinstance(replies, list) and isinstance(result["failed"], int) and result["failed"] * 2 > len(replies)


def run_file(source: Path, target: Path) -> dict[str, object]:
    sentences = json.loads(source.read_text())
    client = DeepSeek(settings_from_env())
    client.check_model()
    result = review(sentences, client, PROMPT.read_text())
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n")
    return result


def main() -> None:
    args = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    args.add_argument("--in", dest="source", type=Path, required=True)
    args.add_argument("--out", dest="target", type=Path, required=True)
    opts = args.parse_args()
    try:
        result = run_file(opts.source, opts.target)
    except DeepSeekError as e:
        sys.exit(f"review_sentences: {e}")
    print(f"review_sentences: {result['calls']} calls, {result['failed']} failed, {result['tokens']} tokens, "
          f"{result['seconds']} s -> {opts.target}")
    if mostly_failed(result):
        sys.exit("review_sentences: most calls failed: the results are written, but do not trust the run")


if __name__ == "__main__":
    main()
