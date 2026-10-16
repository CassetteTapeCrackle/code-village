def last_index(items, target):
    found = -1
    for i, x in enumerate(items):
        if x == target:
            found = i
    return found
