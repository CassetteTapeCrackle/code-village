class Tree:
    def __init__(self, kind, height):
        self.kind = kind
        self.height = height

    def describe(self):
        return f"{self.kind}, {self.height} m"


class FruitTree(Tree):
    pass
