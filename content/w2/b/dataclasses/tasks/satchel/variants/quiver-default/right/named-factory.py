from dataclasses import dataclass, field


def empty_list():
    return []


@dataclass
class Quiver:
    archer: str
    arrows: list = field(default_factory=empty_list)
