class Mushroom:
    def __init__(self, name, spots):
        self.name = name
        self.spots = spots

    def __str__(self):
        return f"{self.name}"

    def __eq__(self, other):
        return isinstance(other, Mushroom) and self.name == other.name and self.spots == other.spots
