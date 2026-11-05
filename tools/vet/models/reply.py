"""The reply a reviewer gives for one sentence: the same shape from DeepSeek and from Claude.

The prompt is docs/test-framework/prompts/review-sentences.md. A reply that does not fit the schema is not trusted:
it becomes verdict "unsure", so the sentence goes to the owner's triage list instead of being accepted.
"""

import ast
import json
from dataclasses import asdict, dataclass

DOCS_PREFIX = "https://docs.python.org/3/"
STATUS_KINDS = ("claim", "doc", "simplification", "advice", "not-a-fact")
VERDICTS = ("true", "false", "unsure")
MAX_REASON = 600


@dataclass(frozen=True)
class Reply:
    fp: str
    status: str  # claim, doc:<url>, simplification, advice or not-a-fact
    verdict: str  # true, false or unsure
    reason: str
    assertion: str | None  # Python source with asserts; JSON key "assert"

    def as_json(self) -> dict[str, object]:
        fields = asdict(self)
        return {"fp": fields["fp"], "status": fields["status"], "verdict": fields["verdict"],
                "reason": fields["reason"], "assert": fields["assertion"]}


def unsure(fp: str, why: str) -> Reply:
    """What a missing, failed or invalid reply becomes."""
    return Reply(fp, "not-a-fact", "unsure", why[:MAX_REASON], None)


def parse_reply(fp: str, raw: str) -> Reply:
    """The reply in `raw` (a JSON object), or an unsure reply that says what was wrong with it."""
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return unsure(fp, "the reply was not JSON")
    return from_dict(fp, data)


def from_dict(fp: str, data: object) -> Reply:
    if not isinstance(data, dict):
        return unsure(fp, "the reply was not a JSON object")
    status, verdict, reason, assertion = (data.get(k) for k in ("status", "verdict", "reason", "assert"))
    problem = _problem(status, verdict, reason, assertion)
    if problem or not isinstance(status, str) or not isinstance(verdict, str) or not isinstance(reason, str):
        return unsure(fp, f"invalid reply: {problem}")
    return Reply(fp, status, verdict, reason.strip(), assertion if isinstance(assertion, str) else None)


def _asserts(source: object) -> bool:
    """True when source parses and holds an assert statement (a comment saying assert does not count)."""
    try:
        return isinstance(source, str) and any(isinstance(node, ast.Assert) for node in ast.walk(ast.parse(source)))
    except (SyntaxError, ValueError):
        return False


def _problem(status: object, verdict: object, reason: object, assertion: object) -> str | None:
    """Why the fields are not a valid reply, None when they are."""
    kind, colon, value = status.partition(":") if isinstance(status, str) else ("", "", "")
    checks = [
        (kind not in STATUS_KINDS, "status must be claim, doc:<url>, simplification, advice or not-a-fact"),
        (kind == "doc" and not value.startswith(DOCS_PREFIX), f"a doc url starts with {DOCS_PREFIX}"),
        (kind != "doc" and bool(colon), "only doc has a value after the colon"),
        (verdict not in VERDICTS, "verdict must be true, false or unsure"),
        (not isinstance(reason, str) or not reason.strip(), "reason is missing"),
        (assertion is not None and not isinstance(assertion, str), "assert must be text or null"),
        (kind == "claim" and not _asserts(assertion), "a claim needs Python source with an assert statement"),
    ]
    return next((message for failed, message in checks if failed), None)
