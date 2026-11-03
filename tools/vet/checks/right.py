"""Rules right-fails and right-missing: each right/*.py is a correct answer written another way, so it must pass
the visible tests and hidden cases (for a boss, every stage and hard mode), and every item needs one."""

from collections.abc import Iterable

from ..adapter import LanguageAdapter
from ..cache import Group
from ..finding import Finding, subject
from ..model import Content
from .rewrites import refused


def _missing(content: Content) -> Iterable[Finding]:
    owners = [(t.id, t.fingerprint, t.folder, t.right) for t in content.tasks]
    owners += [(v.id, v.fingerprint, v.folder, v.right) for t in content.tasks for v in t.variants]
    owners += [(b.id, b.fingerprint, b.folder, b.right) for b in content.bosses]
    for item, fingerprint, folder, right in owners:
        if not right:
            yield subject(item, fingerprint, folder / "right", content.root).finding(
                "right-missing", "no right/*.py: add a correct answer written differently from the solution "
                                 "(another loop, other names, another library call), so Check is seen to accept it")


def check(content: Content, adapter: LanguageAdapter) -> Iterable[Finding]:
    groups = content.solution_groups()

    def answers(group: Group) -> list[tuple[str, str]]:
        return [(path.name, path.read_text()) for path in group[0].right]

    for group, failures in zip(groups, refused(content, "right", groups, answers, adapter), strict=True):
        for name, failure in failures:
            about = subject(group[0].id, group[0].fingerprint, group[0].folder / "right" / name, content.root)
            yield about.finding("right-fails", f"right/{name} is a correct answer, but Check refuses it "
                                               f"({failure}): loosen the test, or fix the answer")
    yield from _missing(content)
