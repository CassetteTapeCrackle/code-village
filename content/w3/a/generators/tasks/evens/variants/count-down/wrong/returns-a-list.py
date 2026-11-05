def down(start, step):
    out = []
    n = start
    while n > 0:
        out.append(n)
        n -= step
    return out
