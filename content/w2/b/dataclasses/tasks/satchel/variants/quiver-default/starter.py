from dataclasses import dataclass


@dataclass
class Quiver:
    archer: str
    arrows: list = []
