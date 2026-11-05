class Trail:
    def __init__(self, name):
        self.name = name


def compare(a, b):
    if a == b:
        return "same"
    if a.name == b.name:
        return "twins"
    return "different"
