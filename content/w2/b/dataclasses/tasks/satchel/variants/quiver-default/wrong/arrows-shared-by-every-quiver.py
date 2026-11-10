from dataclasses import dataclass

SHARED = []


@dataclass
class Quiver:
    archer: str
    arrows: list = None

    def __post_init__(self):
        self.arrows = SHARED
