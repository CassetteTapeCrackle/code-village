class Bird:
    def __init__(self, name):
        self.name = name


def by_name(bird):
    return bird.name


def alphabetical(birds):
    return sorted(birds, key=by_name)
