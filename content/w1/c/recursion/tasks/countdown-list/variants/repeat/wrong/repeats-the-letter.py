def repeat(word, n):
    if n == 0:
        return []
    return [word[0]] + repeat(word, n - 1)
