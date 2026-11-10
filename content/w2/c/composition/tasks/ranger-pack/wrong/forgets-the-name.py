class Backpack:
    def __init__(self):
        self.items = []

    def add(self, item):
        self.items.append(item)


class Ranger:
    def __init__(self, name):
        self.pack = Backpack()
