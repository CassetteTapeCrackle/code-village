def add_lists(a, b):
    result = []
    size = len(a)
    if len(b) > size:
        size = len(b)
    for i in range(size):
        x = 1
        y = 0
        if i < len(a):
            x = a[i]
        if i < len(b):
            y = b[i]
        result.append(x + y)
    return result
