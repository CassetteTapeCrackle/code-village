def without_exact(bags, bag):
    out = []
    for b in bags:
        if b is not bag:
            out.append(b)
    return out
