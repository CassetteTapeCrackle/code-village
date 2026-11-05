def countdown_list(n):
    if n == 0:
        return []
    return countdown_list(n - 1) + [n]
