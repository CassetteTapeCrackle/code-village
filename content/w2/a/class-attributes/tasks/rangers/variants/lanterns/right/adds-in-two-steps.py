class Lantern:
    made = 0

    def __init__(self, colour):
        self.colour = colour
        Lantern.made = Lantern.made + 1
