import bisect


def with_new(sorted_values, x):
    copy = list(sorted_values)
    copy.append(x)
    return copy
