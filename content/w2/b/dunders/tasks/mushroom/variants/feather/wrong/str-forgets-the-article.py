class Feather:
    def __init__(self, colour):
        self.colour = colour

    def __str__(self):
        return f"{self.colour} feather"

    def __eq__(self, other):
        return isinstance(other, Feather) and self.colour == other.colour
