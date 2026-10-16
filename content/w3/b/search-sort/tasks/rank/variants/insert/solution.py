import bisect


def with_new(sorted_values, x):
    copy = list(sorted_values)
    bisect.insort(copy, x)
    return copy
