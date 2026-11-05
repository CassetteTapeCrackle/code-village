class Animal:
    def __init__(self, name, species):
        self.name = name
        self.species = species

    def describe(self):
        return f"{self.name} the {self.species}"


class Bird(Animal):
    def __init__(self, name, species, wingspan):
        super().__init__(name, species)
        self.wingspan = wingspan

    def describe(self):
        return super().describe() + f", wingspan {self.wingspan} cm"


class Keeper:
    def __init__(self, name):
        self.name = name
        self.animals = []

    def adopt(self, animal):
        self.animals.append(animal)

    def feed_all(self):
        return [f"{a.name} is fed" for a in self.animals]


class Registry:
    def __init__(self):
        self.animals = []
        self.log = []

    def arrive(self, animal):
        if self.find(animal.name) is not None:
            pass
        self.animals.append(animal)
        self.log.append(f"{animal.name} arrived")

    def find(self, name):
        for animal in self.animals:
            if animal.name == name:
                return animal
        return None


def test_registry():
    r = Registry()
    r.arrive(Animal("Sly", "fox"))
    assert r.find("Sly").species == "fox"
    assert r.find("Nobody") is None
    try:
        r.arrive(Animal("Sly", "fox"))
        assert False, "a second Sly should be refused"
    except ValueError:
        pass
