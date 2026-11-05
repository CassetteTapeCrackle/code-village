class Tree:
    def __init__(self, kind, age):
        self.kind = kind
        self.age = age


def age_of(tree):
    return tree.age


def oldest_first(trees):
    return [t.age for t in sorted(trees, key=age_of, reverse=True)]
