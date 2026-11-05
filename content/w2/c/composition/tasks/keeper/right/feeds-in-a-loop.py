class Animal:
    def __init__(self, name):
        self.name = name


class Keeper:
    def __init__(self, name):
        self.name = name
        self.animals = []

    def adopt(self, animal):
        self.animals.append(animal)

    def feed_all(self):
        fed = []
        for a in self.animals:
            fed.append(a.name + " is fed")
        return fed
