from dataclasses import dataclass


@dataclass
class Sapling:
    name: str
    height: int = 1

    def grow(self, cm):
        self.height = self.height + cm
