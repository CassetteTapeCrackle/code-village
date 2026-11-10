class Egg:
    def __init__(self, colour):
        self.colour = colour


class Nest:
    def __init__(self):
        self.eggs = []

    def lay(self, egg):
        self.eggs = [egg]

    def colours(self):
        return [e.colour for e in self.eggs]
