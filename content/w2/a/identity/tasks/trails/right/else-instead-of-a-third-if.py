class Trail:
    def __init__(self, name):
        self.name = name


def compare(a, b):
    if a is b:
        return "same"
    elif a.name == b.name:
        return "twins"
    else:
        return "different"
