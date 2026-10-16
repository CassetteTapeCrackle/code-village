class Acorn:
    def __init__(self, weight):
        self.weight = weight

    def __lt__(self, other):
        return self.weight < other.weight
