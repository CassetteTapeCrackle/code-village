from dataclasses import dataclass


@dataclass
class Sapling:
    name: str
    height: int = 0

    def grow(self, cm):
        self.height += cm
