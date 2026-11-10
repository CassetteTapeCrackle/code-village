class Feather:
    def __init__(self, colour):
        self.colour = colour

    def __str__(self):
        return f"a {self.colour} feather"

    def __eq__(self, other):
        return True
