"""Runs one request file from vet/requests/ inside a GitHub Actions job and writes its results to a folder.

A request is JSON with a `job`: `inventory` downloads the Python docs inventory (the cloud sessions cannot reach
docs.python.org), `sentences` asks DeepSeek to review sentences. Sessions start a job by pushing a request file;
GitHub starts a workflow from the API only when the workflow file is on the default branch, and this one is not yet.
Only the standard library is used here: the job runs without the project's Python libraries.
"""

import argparse
import json
import sys
import urllib.request
from collections.abc import Callable
from pathlib import Path

from .deepseek import DeepSeekError
from .logs import emit_files
from .review_sentences import run_file

INVENTORY_URL = "https://docs.python.org/3.12/objects.inv"
INVENTORY_NAME = "python-3.12-objects.inv"
DOWNLOAD_SECONDS = 60


def run_inventory(request: dict[str, object], out: Path) -> None:
    with urllib.request.urlopen(INVENTORY_URL, timeout=DOWNLOAD_SECONDS) as response:  # a fixed https URL
        data = response.read()
    (out / INVENTORY_NAME).write_bytes(data)
    print(f"inventory: {len(data)} bytes from {INVENTORY_URL}")


def run_sentences(request: dict[str, object], out: Path) -> None:
    """Review the request's sentences with DeepSeek; the sentences travel inside the request file."""
    sentences = request.get("sentences")
    if not isinstance(sentences, list):
        sys.exit("a sentences request needs a `sentences` list")
    source = out / "request-sentences.json"
    source.write_text(json.dumps(sentences))
    try:
        result = run_file(source, out / "deepseek-sentences.json")
    except DeepSeekError as e:
        sys.exit(f"sentences: {e}")
    source.unlink()
    print(f"sentences: {len(sentences)} reviewed, {result['calls']} calls, {result['tokens']} tokens, "
          f"{result['seconds']} s")


JOBS: dict[str, Callable[[dict[str, object], Path], None]] = {"inventory": run_inventory,
                                                              "sentences": run_sentences}


def main() -> None:
    args = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    args.add_argument("request", type=Path, help="a JSON file from vet/requests/")
    args.add_argument("--out", type=Path, required=True, help="the folder for this request's results")
    opts = args.parse_args()
    request = json.loads(opts.request.read_text())
    job = request.get("job") if isinstance(request, dict) else None
    if not isinstance(job, str) or job not in JOBS:
        sys.exit(f"{opts.request}: job must be one of {', '.join(sorted(JOBS))}")
    opts.out.mkdir(parents=True, exist_ok=True)
    JOBS[job](request, opts.out)
    emit_files(opts.out)


if __name__ == "__main__":
    main()
