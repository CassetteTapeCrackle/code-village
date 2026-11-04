"""Rules blind-missing, blind-untriaged, blind-too-strict and blind-disagrees (spec 12).

DeepSeek solved each task several times from what a learner has seen; vet/blind/<id>.json holds those attempts run
through the visible tests, the hidden cases and the fuzz set (tools/vet/blind_eval.py), pinned to the item's
fingerprint. Language model output is never judged again on every run: a changed item needs a new run, and a
failing attempt needs a triage decision, which is a person's or a session's word, kept in the file.
"""

import json
import re
from collections.abc import Iterable, Mapping, Sequence
from pathlib import Path
from typing import cast

from ..adapter import LanguageAdapter
from ..finding import Finding, Subject, subject
from ..model import Content

Attempt = Mapping[str, str]
DECISIONS = ("model-wrong", "prompt-fixed", "test-fixed", "solution-fixed")
DECIDERS = ("owner", "session")


ATTEMPTS_PER_ITEM = 5  # blind_solve.ATTEMPTS; a test keeps the two equal
JUDGED = {"visible": ("pass", "fail"), "hidden": ("pass", "fail", "none"), "fuzz": ("agree", "differs", "none")}
SAFE_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9._-]*")


def result_path(folder: Path, item_id: str) -> Path | None:
    """vet/blind/<id>.json, or None for an id that is not a plain file name."""
    return folder / f"{item_id}.json" if SAFE_ID.fullmatch(item_id) else None


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    """Nothing is asked while vet/blind/ does not exist (fixtures); the real content has it."""
    del adapter  # reads the stored results only
    folder = content.root.parent / "vet" / "blind"
    if not folder.is_dir():
        return
    for group in content.solution_groups():
        first = group[0]
        about = subject(first.id, first.fingerprint, first.folder / "solution.py", content.root)
        path = result_path(folder, first.id)
        data = _read(path) if path else None
        attempts = data.get("attempts") if data else None
        if not data or data.get("fingerprint") != first.fingerprint or not _well_formed(attempts):
            yield about.finding("blind-missing", "no complete blind-solver run for this version of the item: run the "
                                                 "vet-models blind job (python -m tools.vet.blind_eval request)")
            continue
        judged = cast(list[Attempt], attempts)
        yield from _judge(about, judged, _triage(data.get("triage"), judged))


def _well_formed(attempts: object) -> bool:
    """A full set of attempts, each a record with only the verdicts a run can give."""
    return (isinstance(attempts, list) and len(attempts) >= ATTEMPTS_PER_ITEM
            and all(isinstance(a, dict) and all(a.get(key) in values for key, values in JUDGED.items())
                    for a in attempts))


def _read(path: Path) -> dict[str, object] | None:
    try:
        data = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError):
        return None
    return data if isinstance(data, dict) else None


def _triage(entries: object, attempts: Sequence[Attempt]) -> dict[int, str]:
    """Attempt number to the reason it is not settled, or "" when a valid decision settles it."""
    settled: dict[int, str] = {}
    for entry in entries if isinstance(entries, list) else []:
        number = entry.get("attempt") if isinstance(entry, dict) else None
        if not isinstance(number, int) or not 0 <= number < len(attempts):
            continue
        attempt = attempts[number]
        quote = attempt.get("case") or attempt.get("failure") or ""
        if entry.get("decision") not in DECISIONS or entry.get("by") not in DECIDERS:
            problem = "its triage decision is not valid"
        elif entry["decision"] == "model-wrong" and (not quote or quote not in str(entry.get("note", ""))):
            problem = f"a model-wrong decision must quote the failing case: {quote}"
        else:
            problem = ""
        settled[number] = settled.get(number) or problem  # one invalid entry unsettles the attempt
    return settled


def _judge(about: Subject, attempts: Sequence[Attempt], triage: Mapping[int, str]) -> Iterable[Finding]:
    strict, open_, disagree = [], [], []
    for number, attempt in enumerate(attempts):
        settled = number in triage and not triage[number]
        shown = attempt.get("case") or attempt.get("failure") or ""
        if attempt.get("visible") == "fail" and attempt.get("hidden") == "pass":
            strict.append(f"attempt {number} ({attempt.get('failure', '')})")
        elif attempt.get("visible") == "fail" or attempt.get("hidden") == "fail":
            if not settled:
                open_.append(f"attempt {number} ({shown}){': ' + triage[number] if triage.get(number) else ''}")
        elif attempt.get("fuzz") == "differs" and not settled:
            disagree.append(f"attempt {number} ({attempt.get('input', '')})")
    if strict:
        yield about.finding("blind-too-strict", "the model fails a visible test but passes every hidden case, so the "
                                                f"test is probably too strict: {'; '.join(strict[:3])}")
    if open_:
        yield about.finding("blind-untriaged", f"{len(open_)} failing attempt(s) are not triaged (the prompt is "
                                               f"ambiguous, a test is wrong, or the model is): {'; '.join(open_[:3])}")
    if disagree:
        yield about.finding("blind-disagrees", "an attempt passes every test but differs from the solution on the "
                                               f"fuzz inputs, so one of the two is wrong: {'; '.join(disagree[:3])}")
