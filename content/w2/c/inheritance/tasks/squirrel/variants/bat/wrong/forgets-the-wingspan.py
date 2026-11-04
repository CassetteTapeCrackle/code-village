class Animal:
    def __init__(self, name):
        self.name = name


class Bat(Animal):
    def __init__(self, name, wingspan):
        super().__init__(name)
        self.wingspan = 0
