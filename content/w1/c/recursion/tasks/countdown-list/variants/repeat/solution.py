def repeat(word, n):
    if n == 0:
        return []
    return [word] + repeat(word, n - 1)
