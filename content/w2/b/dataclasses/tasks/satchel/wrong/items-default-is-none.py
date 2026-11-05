from dataclasses import dataclass, field


@dataclass
class Satchel:
    owner: str
    items: list = None
