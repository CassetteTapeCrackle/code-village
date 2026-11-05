class Egg:
    def __init__(self, colour):
        self.colour = colour


class Nest:
    def __init__(self):
        self.eggs = []

    def lay(self, egg):
        self.eggs.append(egg)

    def colours(self):
        found = []
        for e in self.eggs:
            found.append(e.colour)
        return found
