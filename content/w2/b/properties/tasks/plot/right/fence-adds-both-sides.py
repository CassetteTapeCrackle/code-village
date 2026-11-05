class Plot:
    def __init__(self, width, depth):
        self.width = width
        self.depth = depth

    @property
    def area(self):
        return self.width * self.depth

    @property
    def fence(self):
        return 2 * self.width + 2 * self.depth
