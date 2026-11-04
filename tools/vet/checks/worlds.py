"""Rules world-order-duplicate, world-unknown, region-unnamed, world-key-invalid, gate-boss-missing and
trophy-mismatch.

Every world is ordered once, names every region it teaches, and opens with a boss trophy from an earlier world.
"""

from collections import Counter
from collections.abc import Iterable

from ..adapter import LanguageAdapter
from ..finding import Finding, Subject, subject
from ..model import Content, World, fingerprint_text


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    yield from _lesson_orders(content)
    yield from _regions_without_boss(content)
    yield from _orders(content.worlds)
    yield from _lesson_worlds(content)
    yield from _keys(content)


def _lesson_orders(content: Content) -> Iterable[Finding]:
    """Rule lesson-order-duplicate: lessons run in order within a world, so two sharing a number have no order."""
    taken = Counter((lesson.meta.get("world"), lesson.meta.get("order")) for lesson in content.lessons)
    for (world, order), count in sorted(taken.items(), key=str):
        if count > 1:
            message = f"{count} lessons of {world} have order {order}"
            yield Subject("worlds", fingerprint_text(message), "").finding("lesson-order-duplicate", message)


def _regions_without_boss(content: Content) -> Iterable[Finding]:
    """Rule region-no-boss: a region with lessons ends in a boss, or its gate can never open."""
    guarded = {(b.meta.get("world"), b.meta.get("region")) for b in content.bosses}
    regions = {(lesson.meta.get("world"), lesson.meta.get("region")) for lesson in content.lessons
               if not lesson.meta.get("tour")}
    for world, region in sorted(regions - guarded, key=str):
        message = f"region {world}/{region} has lessons but no boss"
        yield Subject("worlds", fingerprint_text(message), "").finding("region-no-boss", message)


def _orders(worlds: Iterable[World]) -> Iterable[Finding]:
    orders = Counter(order for w in worlds if isinstance(order := w.meta.get("order"), int))
    for dup in sorted(o for o, n in orders.items() if n > 1):
        message = f"order {dup} is used twice"
        yield Subject("worlds", fingerprint_text(message), "").finding("world-order-duplicate", message)


def _lesson_worlds(content: Content) -> Iterable[Finding]:
    by_id = {w.id: w for w in content.worlds}
    for lesson in content.lessons:
        about = subject(str(lesson.meta.get("id")), lesson.fingerprint, lesson.path, content.root)
        world_id, region = lesson.meta.get("world"), lesson.meta.get("region")
        world = by_id.get(str(world_id))
        if world is None:
            yield about.finding("world-unknown", f"world {world_id} has no world.toml")
        elif region not in _table(world.meta.get("regions")):
            yield about.finding("region-unnamed", f"region {region} has no name in {world_id}/world.toml")


def _keys(content: Content) -> Iterable[Finding]:
    orders = [o for w in content.worlds if isinstance(o := w.meta.get("order"), int)]
    first = min(orders, default=None)
    for world in content.worlds:
        about = subject(world.id, world.fingerprint, world.path, content.root)
        key = _table(world.meta.get("key")) if "key" in world.meta else None
        order = world.meta.get("order")
        if order == first and key:
            yield about.finding("world-key-invalid", "the first world must have no [key]: nothing could open it")
        if order != first and not key:
            yield about.finding("world-key-invalid", "needs a [key]: without one it is open from the start")
        if key:
            yield from _gate(content, about, key, order)


def _gate(content: Content, about: Subject, key: dict[str, object], order: object) -> Iterable[Finding]:
    """A [key] opens its world with the trophy of a boss in an earlier world."""
    boss = next((b for b in content.bosses if b.id == key.get("boss")), None)
    if boss is None:
        yield about.finding("gate-boss-missing", f"[key] boss {key.get('boss')} is no boss in the content")
        return
    trophy = _table(boss.meta.get("trophy"))
    if (key.get("trophy"), key.get("trophy_name")) != (trophy.get("id"), trophy.get("name")):
        message = (f"[key] trophy {key.get('trophy')} ({key.get('trophy_name')}) is not the trophy of boss "
                   f"{boss.id}: {trophy.get('id')} ({trophy.get('name')})")
        yield about.finding("trophy-mismatch", message)
    order_of = {w.id: w.meta.get("order", 0) for w in content.worlds}
    if _int(order_of.get(str(boss.meta.get("world")), 0)) >= _int(order):
        yield about.finding("world-key-invalid", f"[key] boss {boss.id} must be in an earlier world")


def _table(value: object) -> dict[str, object]:
    return value if isinstance(value, dict) else {}


def _int(value: object) -> int:
    return value if isinstance(value, int) else 0
