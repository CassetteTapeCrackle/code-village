def count_long(words):
    return sum(1 for w in words if 3 < len(w))
