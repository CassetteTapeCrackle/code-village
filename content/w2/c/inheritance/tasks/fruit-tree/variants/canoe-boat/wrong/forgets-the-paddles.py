class Boat:
    def __init__(self, name):
        self.name = name

    def describe(self):
        return f"{self.name} floats"


class Canoe(Boat):
    def __init__(self, name, paddles):
        super().__init__(name)
        self.paddles = paddles

    def describe(self):
        return super().describe()
