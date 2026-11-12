"""Rules ledger-missing, ledger-stale, claim-id-unknown, claim-id-missing, doc-anchor-missing, remember-unbacked
and fence-untyped: every sentence a learner reads is pinned in a ledger, and says what backs it (spec 2 and 4).

A ledger entry holds the fingerprint of one sentence. Editing the sentence leaves its entry stale and the
sentence missing, so a changed word is reviewed again. `remember` bullets must be backed by a claim or be advice,
or by the docs when `no_claim` says why no claim can run.
"""

import re
from collections import Counter
from collections.abc import Iterable, Sequence

from ..adapter import LanguageAdapter, ToolError
from ..finding import Finding, Subject, subject
from ..ledger import INVENTORY, LedgerEntry, doc_anchor_known, load_inventory, status_kind
from ..model import CodeBlock, Content, TextBlock
from ..prose import Sentence, boss_units, lesson_units, unit_sentences

UNTYPED_FENCE = re.compile(r"^```(?:python|py)\b", re.M)
SHOWN = 3  # sentences quoted in a message; the count says how many more


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    del adapter  # reads text and ledgers only
    for lesson in content.lessons:
        about = subject(str(lesson.meta.get("id")), lesson.fingerprint, lesson.path, content.root)
        claims = [b for b in lesson.blocks if isinstance(b, CodeBlock) and b.kind == "claim"]
        yield from _claims(about, claims)
        texts = [b.markdown for b in lesson.blocks if isinstance(b, TextBlock)]
        yield from _untyped(about, texts)
        yield from _judge(about, unit_sentences(lesson_units(lesson)), lesson.ledger, {c.id for c in claims if c.id})
    for boss in content.bosses:
        about = subject(boss.id, boss.fingerprint, boss.folder / "boss.md", content.root)
        yield from _untyped(about, [boss.intro])
        yield from _judge(about, unit_sentences(boss_units(boss)), boss.ledger, set())


def _claims(about: Subject, claims: Sequence[CodeBlock]) -> Iterable[Finding]:
    without = [c for c in claims if not c.id]
    if without:
        yield about.finding("claim-id-missing", f"{len(without)} claim block(s) have no id: write ```python claim "
                                                "id=<name> so a ledger entry can point to the claim")
    twice = sorted(i for i, n in Counter(c.id for c in claims if c.id).items() if n > 1)
    if twice:
        yield about.finding("claim-id-duplicate", f"claim id {', '.join(twice)} is used twice in this lesson: a ledger "
                                                  "entry could point to either")


def _untyped(about: Subject, texts: Sequence[str]) -> Iterable[Finding]:
    count = sum(len(UNTYPED_FENCE.findall(text)) for text in texts)
    if count:
        yield about.finding("fence-untyped", f"{count} Python fence(s) are not example, predict or claim (min= and "
                                             "id= are the only attributes): a code block must say what it is")


def _backs_a_bullet(entry: LedgerEntry) -> bool:
    kind = status_kind(entry.status)
    return kind in ("claim", "advice") or (kind == "doc" and bool(entry.no_claim.strip()))


def _judge(about: Subject, current: Sequence[Sentence], ledger: Sequence[LedgerEntry],
           claim_ids: set[str]) -> Iterable[Finding]:
    entries = {entry.fp: entry for entry in ledger}
    remember = [s for s in current if s.where.startswith("remember:")]
    others = [s for s in current if not s.where.startswith("remember:")]
    missing = [s for s in others if s.fingerprint not in entries]
    yield from _report(about, "ledger-missing", missing, "sentence(s) with no ledger entry: review each and add "
                                                         "one to ledger.toml")
    unbacked = [s for s in remember if not (s.fingerprint in entries and _backs_a_bullet(entries[s.fingerprint]))]
    yield from _report(about, "remember-unbacked", unbacked,
                       "remember bullet(s) with neither a claim:<id> entry nor status advice (a doc:<url> entry "
                       "counts only with no_claim saying why no claim can run)")
    live = {s.fingerprint for s in current}
    stale = [e for e in ledger if e.fp not in live]
    if stale:
        yield about.finding("ledger-stale", f"{len(stale)} ledger entr{'y' if len(stale) == 1 else 'ies'} match no "
                                            f"sentence any more ({_quote(e.text for e in stale)}): the sentence was "
                                            "edited or removed, so review the new wording and drop the old entry")
    yield from _backing(about, ledger, claim_ids)


def _backing(about: Subject, ledger: Sequence[LedgerEntry], claim_ids: set[str]) -> Iterable[Finding]:
    unknown = [e for e in ledger if status_kind(e.status) == "claim" and e.status.partition(":")[2] not in claim_ids]
    if unknown:
        yield about.finding("claim-id-unknown", f"no claim block has the id of: {_quote(e.status for e in unknown)}")
    docs = [e for e in ledger if status_kind(e.status) == "doc"]
    if not docs:
        return
    if not INVENTORY.is_file():
        raise ToolError(f"{INVENTORY.name} is missing: the docs links cannot be checked (vet-models job inventory)")
    inventory = load_inventory()
    bad = [e.status for e in docs if not doc_anchor_known(e.status.partition(":")[2], inventory)]
    if bad:
        yield about.finding("doc-anchor-missing", "not a docs.python.org/3 page#anchor in the pinned 3.12 "
                                                  f"inventory: {_quote(bad)}")


def _report(about: Subject, rule: str, sentences: Sequence[Sentence], what: str) -> Iterable[Finding]:
    if sentences:
        yield about.finding(rule, f"{len(sentences)} {what}: {_quote(s.text for s in sentences)}")


def _quote(texts: Iterable[str]) -> str:
    items = list(texts)
    shown = "; ".join(f'"{t[:60]}"' for t in items[:SHOWN])
    return shown + (f"; and {len(items) - SHOWN} more" if len(items) > SHOWN else "")
