def down(start, step):
    n = start
    while n > 0:
        yield n
        n -= step
