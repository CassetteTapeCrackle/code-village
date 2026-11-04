class Egg:
    def __init__(self, colour):
        self.colour = colour


class Nest:
    def __init__(self):
        self.eggs = []

    def lay(self, egg):
        self.eggs.append(egg)

    def colours(self):
        return [self.eggs[0].colour]
