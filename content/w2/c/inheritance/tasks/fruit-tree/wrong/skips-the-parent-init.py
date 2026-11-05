class Tree:
    def __init__(self, kind, height):
        self.kind = kind
        self.height = height

    def describe(self):
        return f"{self.kind}, {self.height} m"


class FruitTree(Tree):
    def __init__(self, kind, height, fruit):
        self.fruit = fruit

    def describe(self):
        return super().describe() + f", gives {self.fruit}"
