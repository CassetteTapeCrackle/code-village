def in_both(a, b):
    both = []
    for x in a:
        if x in b and x not in both:
            both.append(x)
    return sorted(both)
