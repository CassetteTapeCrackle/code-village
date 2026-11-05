class Hiker:
    def __init__(self, name, km):
        self.name = name
        self.km = km


def negative_distance(hiker):
    return -hiker.km


def rank(hikers):
    return [h.name for h in sorted(hikers, key=negative_distance)]
