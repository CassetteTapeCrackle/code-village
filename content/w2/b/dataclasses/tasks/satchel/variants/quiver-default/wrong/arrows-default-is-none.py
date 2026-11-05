from dataclasses import dataclass, field


@dataclass
class Quiver:
    archer: str
    arrows: list = None
