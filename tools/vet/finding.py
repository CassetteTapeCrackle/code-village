"""What a check reports, and the part of it the gap list tracks."""

from dataclasses import dataclass


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
