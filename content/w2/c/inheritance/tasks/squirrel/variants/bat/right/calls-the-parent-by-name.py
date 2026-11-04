class Animal:
    def __init__(self, name):
        self.name = name


class Bat(Animal):
    def __init__(self, name, wingspan):
        Animal.__init__(self, name)
        self.wingspan = wingspan
