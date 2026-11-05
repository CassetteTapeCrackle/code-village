class Bird:
    def __init__(self, name):
        self.name = name


def name_of(bird):
    return bird.name


def last_letter_of(bird):
    return bird.name[-1]


def alphabetical(birds):
    return sorted(birds, key=last_letter_of)
