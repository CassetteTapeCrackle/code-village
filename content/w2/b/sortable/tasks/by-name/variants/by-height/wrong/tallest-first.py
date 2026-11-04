class Tree:
    def __init__(self, kind, height):
        self.kind = kind
        self.height = height


def height_of(tree):
    return tree.height


def shortest_first(trees):
    return sorted(trees, key=height_of, reverse=True)
