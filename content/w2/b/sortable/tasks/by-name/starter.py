class Bird:
    def __init__(self, name):
        self.name = name


def name_of(bird):
    # return what to sort by
    pass


def alphabetical(birds):
    return sorted(birds, key=name_of)
