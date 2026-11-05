class Tree:
    def __init__(self, kind, age):
        self.kind = kind
        self.age = age


def negative_age(tree):
    return -tree.age


def oldest_first(trees):
    return [t.kind for t in sorted(trees, key=negative_age)]
