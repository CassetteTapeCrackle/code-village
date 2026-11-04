def add_lists(a, b):
    result = []
    for i in range(max(len(a), len(b))):
        x = 1
        y = 0
        if i < len(a):
            x = a[i]
        if i < len(b):
            y = b[i]
        result.append(x + y)
    return result
