"""What a check reports, and the part of it the gap list tracks."""

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True, order=True)
class GapKey:
    rule: str
    item: str
    fingerprint: str


@dataclass(frozen=True)
class Finding:
    rule: str
    item: str
    fingerprint: str
    message: str
    path: str

    @property
    def key(self) -> GapKey:
        return GapKey(rule=self.rule, item=self.item, fingerprint=self.fingerprint)



@dataclass(frozen=True)
class Subject:
    """What findings are about: the item id, the fingerprint they are pinned to, and the file to open."""

    item: str
    fingerprint: str
    path: str

    def finding(self, rule: str, message: str) -> Finding:
        return Finding(rule, self.item, self.fingerprint, message, self.path)


def subject(item: str, fingerprint: str, path: Path, root: Path) -> Subject:
    """A Subject whose path is relative to the content root when it lies inside it."""
    relative = str(path.relative_to(root)) if path.is_relative_to(root) else str(path)
    return Subject(item, fingerprint, relative)
