class Bird:
    def __init__(self, name):
        self.name = name


def name_of(bird):
    return bird.name


def alphabetical(birds):
    return sorted(birds, key=name_of)
