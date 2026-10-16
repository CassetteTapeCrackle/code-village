class Boat:
    def __init__(self, name):
        self.name = name

    def describe(self):
        return f"{self.name} floats"


class Canoe(Boat):
    pass
