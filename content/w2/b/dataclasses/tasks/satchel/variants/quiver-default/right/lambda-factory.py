from dataclasses import dataclass, field


@dataclass
class Quiver:
    archer: str
    arrows: list = field(default_factory=lambda: [])
