"""Carries a job's result files through the job log.

The cloud sessions can read an Actions job log with `gh api .../jobs/<id>/logs`, but not download the artifact
(its blob host is outside the network allowance). So a job also prints each result file between markers, base64 in
short lines with a sha256, and `python -m tools.vet.models.logs <log> <folder>` writes the files back.
Only the standard library is used: the job runs without the project's Python libraries.
"""

import argparse
import base64
import hashlib
import re
import sys
from pathlib import Path

CHUNK = 3000  # characters of base64 per log line
BEGIN = re.compile(r"VET-FILE-BEGIN (\S+) ([0-9a-f]{64})\s*$")
DATA = re.compile(r"VET-FILE-DATA ([A-Za-z0-9+/=]+)\s*$")
END = re.compile(r"VET-FILE-END (\S+)\s*$")


class LogError(ValueError):
    """The log does not hold a file whole: cut off, or changed on the way."""


def emit_files(folder: Path) -> None:
    """Print every file under folder, so a session can read it from the job log."""
    for path in sorted(p for p in folder.rglob("*") if p.is_file()):
        data = path.read_bytes()
        name = path.relative_to(folder).as_posix()
        print(f"VET-FILE-BEGIN {name} {hashlib.sha256(data).hexdigest()}")
        text = base64.b64encode(data).decode()
        for start in range(0, len(text), CHUNK):
            print(f"VET-FILE-DATA {text[start:start + CHUNK]}")
        print(f"VET-FILE-END {name}")


def extract_files(log: str) -> dict[str, bytes]:
    """The files printed by emit_files, by their path; a log line may carry a timestamp before the marker."""
    files: dict[str, bytes] = {}
    name: str | None = None
    digest = ""
    chunks: list[str] = []
    for line in log.splitlines():
        if begin := BEGIN.search(line):
            name, digest, chunks = begin.group(1), begin.group(2), []
        elif name and (data := DATA.search(line)):
            chunks.append(data.group(1))
        elif name and (end := END.search(line)):
            if end.group(1) != name:
                raise LogError(f"{name} ends as {end.group(1)}")
            content = base64.b64decode("".join(chunks))
            if hashlib.sha256(content).hexdigest() != digest:
                raise LogError(f"{name}: the checksum does not match what the job printed")
            files[name], name = content, None
    if name:
        raise LogError(f"{name} is not complete in the log")
    return files


def main() -> None:
    args = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    args.add_argument("log", type=Path, help="a job log saved from `gh api .../jobs/<id>/logs`")
    args.add_argument("folder", type=Path, help="where to write the files")
    opts = args.parse_args()
    try:
        files = extract_files(opts.log.read_text(encoding="utf-8-sig"))
    except LogError as e:
        sys.exit(f"logs: {e}")
    if not files:
        sys.exit("logs: no result file in this log: is it the log of the right job, and complete?")
    for name, data in files.items():
        target = opts.folder / name
        if not target.resolve().is_relative_to(opts.folder.resolve()):
            sys.exit(f"logs: {name} would be written outside {opts.folder}")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        print(f"logs: {name} ({len(data)} bytes)")


if __name__ == "__main__":
    main()
