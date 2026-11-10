"""Rules boss-region-empty and boss-region-taken: each boss guards one region that has lessons."""

import re
from collections import Counter
from collections.abc import Iterable

from ..adapter import LanguageAdapter
from ..finding import Finding, Subject, subject
from ..model import Boss, Content


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
        yield from _stages(about, boss)


def _positive_int(value: object) -> bool:
    return isinstance(value, int) and value > 0


def _stages(about: Subject, boss: Boss) -> Iterable[Finding]:
    """Rules stage-order-duplicate and stage-hp-invalid: stages run in folder order and each needs HP to lose."""
    numbers = Counter(m.group() for stage in boss.stages if (m := re.match(r"\d+", stage.where.rsplit("/", 1)[-1])))
    twice = sorted(n for n, count in numbers.items() if count > 1)
    if twice:
        yield about.finding("stage-order-duplicate", f"stages of {boss.id} share the number {', '.join(twice)} in "
                                                     "their folder names: their order is not set")
    bad = [stage.id for stage in boss.stages if not _positive_int(stage.meta.get("hp"))]
    if bad:
        yield about.finding("stage-hp-invalid", f"stage {', '.join(bad)} needs hp above 0, or beating it takes no "
                                                "damage off the boss")
