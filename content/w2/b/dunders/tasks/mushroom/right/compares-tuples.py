class Mushroom:
    def __init__(self, name, spots):
        self.name = name
        self.spots = spots

    def __str__(self):
        return f"{self.name} ({self.spots} spots)"

    def __eq__(self, other):
        return isinstance(other, Mushroom) and (self.name, self.spots) == (other.name, other.spots)
