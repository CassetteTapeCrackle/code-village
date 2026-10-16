def countdown_list(n):
    if n == 0:
        return []
    return [n] + countdown_list(n - 1)
