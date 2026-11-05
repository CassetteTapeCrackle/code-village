class Pantry:
    def __init__(self):
        self.shelf = []

    def store(self, food):
        self.shelf.append(food)


class Cook(Pantry):
    def __init__(self, name):
        super().__init__()
        self.name = name
