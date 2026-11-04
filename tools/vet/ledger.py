"""Claims ledger files and the pinned Python docs inventory.

A `ledger.toml` sits next to each lesson.md and boss.md. Each `[[sentence]]` entry pins one sentence by the
fingerprint of its normalized text and says what backs it: a runnable claim, the Python docs, a deliberate
simplification, advice, or nothing to back (instructions and story). Editing a sentence re-opens it.

`python -m tools.vet.pending out.json` lists every sentence without a current entry, with its paragraph.
"""

import json
import re
import tomllib
import zlib
from collections.abc import Iterable
from dataclasses import dataclass
from pathlib import Path

DOCS_PREFIX = "https://docs.python.org/3/"
INVENTORY = Path(__file__).with_name("data") / "python-3.12-objects.inv"
STATUS_WORDS = ("simplification", "advice", "not-a-fact")
REVIEW_VERDICTS = ("agree", "disagree", "false", "unsure")
DECIDERS = ("auto", "owner")
INVENTORY_HEADER_LINES = 4  # Sphinx objects.inv v2: four text lines, then a zlib stream
INVENTORY_LINE = re.compile(r"(.+?)\s+(\S+)\s+(-?\d+)\s+?(\S*)\s+(.*)")


@dataclass(frozen=True)
class LedgerEntry:
    fp: str
    text: str
    where: str
    status: str  # "claim:<id>", "doc:<url>", "simplification", "advice" or "not-a-fact"
    reason: str = ""
    deepseek: str = ""
    claude: str = ""
    decided: str = ""


def status_kind(status: str) -> str:
    """`claim` for claim:<id>, `doc` for doc:<url>, else the status itself."""
    return status.partition(":")[0]


def status_problem(entry: LedgerEntry) -> str | None:
    """Why an entry's fields are not allowed, None when they are."""
    kind, _, value = entry.status.partition(":")
    checks = [
        (kind in ("claim", "doc") and not value, f"status {entry.status} needs a value after the colon"),
        (kind not in ("claim", "doc") and entry.status not in STATUS_WORDS,
         f"status {entry.status} must be claim:<id>, doc:<url>, {', '.join(STATUS_WORDS)}"),
        (entry.status == "simplification" and not entry.reason.strip(), "a simplification needs a reason"),
        (entry.deepseek not in ("", *REVIEW_VERDICTS), f"deepseek must be one of {', '.join(REVIEW_VERDICTS)}"),
        (entry.claude not in ("", *REVIEW_VERDICTS), f"claude must be one of {', '.join(REVIEW_VERDICTS)}"),
        (entry.decided not in DECIDERS, f"decided must be one of {', '.join(DECIDERS)}: who settled this entry"),
        (entry.decided == "auto" and (entry.deepseek, entry.claude) != ("agree", "agree"),
         "an auto entry needs both families to agree"),
    ]
    return next((message for failed, message in checks if failed), None)


def parse_ledger(text: str) -> tuple[list[LedgerEntry], list[str]]:
    """The entries of a ledger.toml and the problems with it; a broken file gives no entries."""
    try:
        tables = tomllib.loads(text).get("sentence", [])
    except tomllib.TOMLDecodeError as e:
        return [], [f"unreadable: {e}"]
    entries: list[LedgerEntry] = []
    problems: list[str] = []
    for number, table in enumerate(tables if isinstance(tables, list) else [], start=1):
        fields = {k: table.get(k, "") for k in ("fp", "text", "where", "status", "reason", "deepseek", "claude",
                                                 "decided")}
        if not all(isinstance(v, str) for v in fields.values()) or not all(fields[k] for k in
                                                                            ("fp", "text", "where", "status")):
            problems.append(f"entry {number} needs fp, text, where and status, all text")
            continue
        entry = LedgerEntry(**fields)
        repeated = "fp repeats an earlier entry" if entry.fp in {e.fp for e in entries} else None
        problem = status_problem(entry) or repeated
        if problem:
            problems.append(f"entry {number} ({entry.fp}): {problem}")
        entries.append(entry)
    return entries, problems


def dump_ledger(entries: Iterable[LedgerEntry]) -> str:
    """ledger.toml text. Strings are written as JSON strings, which TOML reads the same way."""
    blocks = []
    for entry in entries:
        lines = ["[[sentence]]"]
        lines += [f"{name} = {json.dumps(value, ensure_ascii=False)}" for name, value in vars(entry).items() if value]
        blocks.append("\n".join(lines))
    return "\n\n".join(blocks) + "\n" if blocks else ""


def parse_inventory(data: bytes) -> frozenset[str]:
    """Every page#anchor the Sphinx inventory lists, as docs.python.org/3/ paths."""
    rest = data.split(b"\n", INVENTORY_HEADER_LINES)[-1]
    found = set()
    for line in zlib.decompress(rest).decode().splitlines():
        if match := INVENTORY_LINE.match(line):
            name, uri = match.group(1), match.group(4)
            found.add(uri.replace("$", name) if uri.endswith("$") else uri)
    return frozenset(found)


def doc_anchor_known(url: str, inventory: frozenset[str]) -> bool:
    """True for https://docs.python.org/3/<page>#<anchor> when the inventory has that page and anchor."""
    return url.startswith(DOCS_PREFIX) and "#" in url and url.removeprefix(DOCS_PREFIX) in inventory


def load_inventory(path: Path = INVENTORY) -> frozenset[str]:
    return parse_inventory(path.read_bytes())
