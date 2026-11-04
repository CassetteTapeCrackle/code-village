class Window:
    def __init__(self, width, height):
        self.width = width
        self.height = height

    @property
    def glass(self):
        return self.height * self.width
