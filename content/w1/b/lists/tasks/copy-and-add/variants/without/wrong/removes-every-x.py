def without(items, x):
    new = items.copy()
    for i in items:
        if i == x:
            new.remove(i)
    return new
