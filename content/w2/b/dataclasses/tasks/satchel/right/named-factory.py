from dataclasses import dataclass, field


def make_list():
    return []


@dataclass
class Satchel:
    owner: str
    items: list = field(default_factory=make_list)
