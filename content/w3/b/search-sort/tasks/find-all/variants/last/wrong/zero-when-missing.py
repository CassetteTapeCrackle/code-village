def last_index(items, target):
    found = 0
    for i, x in enumerate(items):
        if x == target:
            found = i
    return found
