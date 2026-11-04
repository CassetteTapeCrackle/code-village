from itertools import zip_longest


def add_lists(a, b):
    return [x + y for x, y in zip_longest(a, b, fillvalue=0)]
