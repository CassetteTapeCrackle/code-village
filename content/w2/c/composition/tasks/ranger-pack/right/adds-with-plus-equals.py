class Backpack:
    def __init__(self):
        self.items = []

    def add(self, item):
        self.items += [item]


class Ranger:
    def __init__(self, name):
        self.name = name
        self.pack = Backpack()
