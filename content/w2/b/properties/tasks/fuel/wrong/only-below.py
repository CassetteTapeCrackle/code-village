class Stove:
    def __init__(self, fuel):
        self.fuel = fuel

    @property
    def fuel(self):
        return self._fuel

    @fuel.setter
    def fuel(self, value):
        if value < 0:
            raise ValueError("fuel must be 0 to 100")
        self._fuel = value
