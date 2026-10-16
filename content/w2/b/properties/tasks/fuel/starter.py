class Stove:
    def __init__(self, fuel):
        self.fuel = fuel

    @property
    def fuel(self):
        return self._fuel

    @fuel.setter
    def fuel(self, value):
        # refuse values outside 0 to 100 with ValueError
        pass
