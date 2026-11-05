import bisect


def with_new(sorted_values, x):
    bisect.insort(sorted_values, x)
    return sorted_values
