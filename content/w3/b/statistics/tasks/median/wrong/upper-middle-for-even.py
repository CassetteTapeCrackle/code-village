def median(values):
    s = sorted(values)
    mid = len(s) // 2
    if len(s) % 2 == 0:
        return s[mid]
    return s[mid]
