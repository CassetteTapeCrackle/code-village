class Animal:
    def __init__(self, name):
        self.name = name


class Squirrel(Animal):
    def __init__(self, name):
        super().__init__(name)
        self.stash = []
