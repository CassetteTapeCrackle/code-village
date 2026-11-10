from dataclasses import dataclass

SHARED = []


@dataclass
class Satchel:
    owner: str
    items: list = None

    def __post_init__(self):
        self.items = SHARED
