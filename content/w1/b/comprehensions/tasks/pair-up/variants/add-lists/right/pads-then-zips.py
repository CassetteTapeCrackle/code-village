def add_lists(a, b):
    size = max(len(a), len(b))
    a = a + [0] * (size - len(a))
    b = b + [0] * (size - len(b))
    return [x + y for x, y in zip(a, b)]
