class Hiker:
    def __init__(self, name, km):
        self.name = name
        self.km = km


def distance(hiker):
    return hiker.km


def rank(hikers):
    return [h.name for h in sorted(hikers, key=lambda h: -h.km)]
