def in_both(a, b):
    both = []
    for x in a:
        if x in b:
            both.append(x)
    both.sort()
    return both
