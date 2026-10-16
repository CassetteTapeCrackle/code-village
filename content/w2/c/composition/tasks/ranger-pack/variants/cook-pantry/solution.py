class Pantry:
    def __init__(self):
        self.shelf = []

    def store(self, food):
        self.shelf.append(food)


class Cook:
    def __init__(self, name):
        self.name = name
        self.pantry = Pantry()
