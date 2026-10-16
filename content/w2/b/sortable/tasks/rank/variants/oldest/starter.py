class Tree:
    def __init__(self, kind, age):
        self.kind = kind
        self.age = age


def oldest_first(trees):
    return [t.kind for t in sorted(trees, reverse=True)]
