import bisect


def on_list(names, name):
    names = sorted(names)
    i = bisect.bisect_left(names, name)
    return i < len(names) and names[i] == name
