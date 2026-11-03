"""Rules world-order-duplicate, world-unknown, region-unnamed and world-key-invalid.

Every world is ordered once, names every region it teaches, and opens with a boss trophy from an earlier world.
"""

from collections import Counter
from collections.abc import Iterable

from ..adapter import LanguageAdapter
from ..finding import Finding, Subject, subject
from ..model import Content, World, fingerprint_text


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    yield from _orders(content.worlds)
    yield from _lesson_worlds(content)
    yield from _keys(content)


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
    order_of = {w.id: w.meta.get("order", 0) for w in content.worlds}
    trophies = {_table(b.meta.get("trophy")).get("id"): b for b in content.bosses}
    for world in content.worlds:
        about = subject(world.id, world.fingerprint, world.path, content.root)
        key = _table(world.meta.get("key")) if "key" in world.meta else None
        order = world.meta.get("order")
        if order == first and key:
            yield about.finding("world-key-invalid", "the first world must have no [key]: nothing could open it")
        if order != first and not key:
            yield about.finding("world-key-invalid", "needs a [key]: without one it is open from the start")
        if not key:
            continue
        boss = trophies.get(key.get("trophy"))
        if boss is None or boss.id != key.get("boss"):
            message = f"[key] trophy {key.get('trophy')} is not the trophy of boss {key.get('boss')}"
            yield about.finding("world-key-invalid", message)
        elif _int(order_of.get(str(boss.meta.get("world")), 0)) >= _int(order):
            yield about.finding("world-key-invalid", f"[key] boss {boss.id} must be in an earlier world")


def _table(value: object) -> dict[str, object]:
    return value if isinstance(value, dict) else {}


def _int(value: object) -> int:
    return value if isinstance(value, int) else 0
