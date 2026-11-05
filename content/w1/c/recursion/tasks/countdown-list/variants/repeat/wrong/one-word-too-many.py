def repeat(word, n):
    if n == -1:
        return []
    return [word] + repeat(word, n - 1)
