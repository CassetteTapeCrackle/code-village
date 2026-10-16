class Backpack:
    def __init__(self):
        self.items = []

    def add(self, item):
        self.items.append(item)


class Ranger(Backpack):
    def __init__(self, name):
        super().__init__()
        self.name = name
