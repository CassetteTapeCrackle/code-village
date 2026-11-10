import bisect


def on_list(names, name):
    i = bisect.bisect_left(names, name)
    return i < len(names) and names[i] == name
