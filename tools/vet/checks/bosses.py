"""Rules boss-region-empty and boss-region-taken: each boss guards one region that has lessons."""

from collections.abc import Iterable

from ..adapter import LanguageAdapter
from ..finding import Finding, subject
from ..model import Content


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    regions = {(lesson.meta.get("world"), lesson.meta.get("region")) for lesson in content.lessons}
    seen = set()
    for boss in content.bosses:
        about = subject(boss.id, boss.fingerprint, boss.folder / "boss.md", content.root)
        key = (boss.meta.get("world"), boss.meta.get("region"))
        if key not in regions:
            message = f"region {key[0]}/{key[1]} has no lessons, so this boss can never open"
            yield about.finding("boss-region-empty", message)
        if key in seen:
            yield about.finding("boss-region-taken", f"region {key[0]}/{key[1]} already has a boss")
        seen.add(key)
