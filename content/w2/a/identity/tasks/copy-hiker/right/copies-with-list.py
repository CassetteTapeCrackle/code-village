class Hiker:
    def __init__(self, name, pack):
        self.name = name
        self.pack = pack


def copy_hiker(hiker):
    return Hiker(hiker.name, list(hiker.pack))
