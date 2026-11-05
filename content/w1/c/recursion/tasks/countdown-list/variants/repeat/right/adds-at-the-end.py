def repeat(word, n):
    if n == 0:
        return []
    return repeat(word, n - 1) + [word]
