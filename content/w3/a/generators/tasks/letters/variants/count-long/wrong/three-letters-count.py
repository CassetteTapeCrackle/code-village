def count_long(words):
    return sum(1 for w in words if len(w) >= 3)
