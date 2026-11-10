"""Rules item-id-duplicate, lesson-id-mismatch and trophy-duplicate: progress is stored by id, so two things
sharing one would share it."""

from collections import Counter
from collections.abc import Iterable

from ..adapter import LanguageAdapter
from ..finding import Finding, Subject
from ..model import Content, fingerprint_text


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    tasks = content.tasks
    ids = Counter([str(lesson.meta.get("id") or "") for lesson in content.lessons]
                  + [str(t.meta.get("id") or "") for t in tasks]
                  + [str(v.meta.get("id") or "") for t in tasks for v in t.variants]
                  + [str(b.meta.get("id") or "") for b in content.bosses]
                  + [str(s.meta.get("id") or "") for b in content.bosses for s in b.stages])
    for dup in sorted(i for i, n in ids.items() if i and n > 1):
        message = f"{dup} is used twice"
        yield Subject("ids", fingerprint_text(message), "").finding("item-id-duplicate", message)
    for lesson in content.lessons:
        if lesson.meta.get("id") != lesson.path.parent.name:
            message = f"lesson {lesson.meta.get('id')} sits in the folder {lesson.path.parent.name}: they must match"
            yield Subject("ids", fingerprint_text(message), str(lesson.path.parent.name)).finding(
                "lesson-id-mismatch", message)
    rewards = Counter([_reward(b.meta.get("trophy")) for b in content.bosses]
                      + [_reward(b.meta.get("hard_trophy")) for b in content.bosses]
                      + [_reward(lesson.meta.get("loot")) for lesson in content.lessons])
    for dup in sorted(i for i, n in rewards.items() if i and n > 1):
        message = f"the trophy or loot {dup} is given twice: a learner who owns one owns both"
        yield Subject("ids", fingerprint_text(message), "").finding("trophy-duplicate", message)


def _reward(value: object) -> str:
    """The id of a trophy or loot table."""
    return str(value.get("id") or "") if isinstance(value, dict) else ""
