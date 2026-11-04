def without_exact(bags, bag):
    out = []
    for b in bags:
        if id(b) != id(bag):
            out.append(b)
    return out
