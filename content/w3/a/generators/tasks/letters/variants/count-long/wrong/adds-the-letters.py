def count_long(words):
    return sum(len(w) for w in words if len(w) > 3)
