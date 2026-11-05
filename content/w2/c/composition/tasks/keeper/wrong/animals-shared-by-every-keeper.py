class Animal:
    def __init__(self, name):
        self.name = name


class Keeper:
    animals = []

    def __init__(self, name):
        self.name = name

    def adopt(self, animal):
        self.animals.append(animal)

    def feed_all(self):
        return [f"{a.name} is fed" for a in self.animals]
