from dataclasses import dataclass


@dataclass
class Toadstool:
    name: str
    spots: int = 0

    def add_spot(self):
        self.spots += 2
