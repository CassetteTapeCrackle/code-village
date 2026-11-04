def repeat(word, n):
    return [word] + repeat(word, n - 1) if n else []
