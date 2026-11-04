"""The sentences of a lesson or boss: what the claims ledger pins, one entry per sentence.

A sentence is cut from the text a learner reads (lesson prose, remember bullets, task prompts, hints, boss text),
never from code. Its fingerprint ignores case and spacing, so editing one word re-opens that sentence and
reflowing a paragraph does not.
"""

import hashlib
import re
from collections.abc import Iterable, Iterator
from dataclasses import dataclass

from .model import Boss, Content, Lesson, TaskBlock, TextBlock

FENCED_CODE = re.compile(r"^```.*?^```[ \t]*$", re.S | re.M)
LIST_START = re.compile(r"^\s*(?:[-*+]|\d+\.)\s+")
HEADING = re.compile(r"^#+\s+")
NOT_A_STOP = ("e.g", "i.e")  # an abbreviation's dot does not end a sentence
CLOSERS = "\"')]"  # a sentence may end inside quotes or brackets
SENTENCE_ENDS = ".!?"


@dataclass(frozen=True)
class Sentence:
    text: str
    where: str  # text:3, remember:0, task:<id>:prompt, task:<id>:hint:2, boss:intro, stage:<id>:prompt
    fingerprint: str


def sentence_fingerprint(text: str) -> str:
    """sha256 of the lower-cased text with whitespace collapsed, first 12 hex digits.
    Not model.fingerprint_text, which hashes bytes as they are."""
    return hashlib.sha256(" ".join(text.lower().split()).encode()).hexdigest()[:12]


def paragraphs(markdown: str) -> list[str]:
    """The prose of some Markdown, one string per paragraph or list item, with code fences dropped."""
    units: list[str] = []
    current: list[str] = []
    for line in FENCED_CODE.sub("\n\n", markdown).splitlines():
        if not line.strip() or LIST_START.match(line):
            units.append(" ".join(current))
            current = []
        if line.strip():
            current.append(HEADING.sub("", LIST_START.sub("", line.strip())))
    units.append(" ".join(current))
    return [" ".join(unit.split()) for unit in units if unit.strip()]


def split_sentences(paragraph: str) -> list[str]:
    """Cut at . ! ? followed by space, except inside backticks, after e.g or i.e, or after a digit."""
    found: list[str] = []
    start = 0
    in_code = False
    for i, char in enumerate(paragraph):
        in_code ^= char == "`"
        if in_code or char not in SENTENCE_ENDS or not _ends_here(paragraph, i):
            continue
        end = i + 1
        while end < len(paragraph) and paragraph[end] in CLOSERS:
            end += 1
        found.append(paragraph[start:end].strip())
        start = end
    found.append(paragraph[start:].strip())
    return [s for s in found if s]


def _ends_here(text: str, i: int) -> bool:
    after = text[i + 1:i + 2]
    if after and not after.isspace() and after not in CLOSERS:
        return False
    abbreviation = text[:i].lower().endswith(NOT_A_STOP) or (i > 0 and text[i - 1].isdigit())
    return not (text[i] == "." and abbreviation)


def sentences(markdown: str, where: str) -> list[Sentence]:
    return [Sentence(s, where, sentence_fingerprint(s)) for p in paragraphs(markdown) for s in split_sentences(p)]


def lesson_units(lesson: Lesson) -> Iterator[tuple[str, str]]:
    """(where, markdown) for every piece of text in a lesson, in reading order, remember bullets last."""
    for index, block in enumerate(lesson.blocks):
        if isinstance(block, TextBlock):
            yield f"text:{index}", block.markdown
        elif isinstance(block, TaskBlock):
            task = block.task
            yield f"task:{task.id}:prompt", str(task.meta.get("prompt", ""))
            hints = enumerate(task.hints)
            yield from ((f"task:{task.id}:hint:{n}", hint) for n, hint in hints if isinstance(hint, str))
            yield from ((f"task:{v.id}:prompt", str(v.meta.get("prompt", ""))) for v in task.variants)
    remember = lesson.meta.get("remember")
    for n, bullet in enumerate(remember if isinstance(remember, list) else []):
        yield f"remember:{n}", str(bullet)


def boss_units(boss: Boss) -> Iterator[tuple[str, str]]:
    yield "boss:intro", boss.intro
    yield from ((f"stage:{stage.id}:prompt", str(stage.meta.get("prompt", ""))) for stage in boss.stages)


def unit_sentences(units: Iterable[tuple[str, str]]) -> list[Sentence]:
    """All sentences of the units; a sentence that appears twice is kept once, at its first place."""
    seen: dict[str, Sentence] = {}
    for where, markdown in units:
        for sentence in sentences(markdown, where):
            seen.setdefault(sentence.fingerprint, sentence)
    return list(seen.values())


def pending_sentences(content: Content) -> list[dict[str, str]]:
    """Every sentence with no current ledger entry, with its paragraph and the file it sits in."""
    pending: list[dict[str, str]] = []
    owners = [(str(lesson.meta.get("id")), lesson.path, lesson.ledger, lesson_units(lesson))
              for lesson in content.lessons]
    owners += [(boss.id, boss.folder / "boss.md", boss.ledger, boss_units(boss)) for boss in content.bosses]
    for item, path, ledger, units in owners:
        known = {entry.fp for entry in ledger}
        seen = set(known)
        for where, markdown in units:
            for paragraph in paragraphs(markdown):
                for text in split_sentences(paragraph):
                    fp = sentence_fingerprint(text)
                    if fp not in seen:
                        seen.add(fp)
                        pending.append({"file": str(path.relative_to(content.root)), "item": item, "fp": fp,
                                        "text": text, "where": where, "paragraph": paragraph})
    return pending
