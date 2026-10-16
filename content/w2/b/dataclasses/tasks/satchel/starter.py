from dataclasses import dataclass


@dataclass
class Satchel:
    owner: str
    items: list = []
