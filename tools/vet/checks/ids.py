"""Rule item-id-duplicate: progress is stored by id, so two things sharing one would share progress."""

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
