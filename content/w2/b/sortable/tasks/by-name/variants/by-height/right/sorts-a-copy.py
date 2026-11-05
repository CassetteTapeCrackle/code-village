class Tree:
    def __init__(self, kind, height):
        self.kind = kind
        self.height = height


def height_of(tree):
    return tree.height


def shortest_first(trees):
    result = trees.copy()
    result.sort(key=height_of)
    return result
