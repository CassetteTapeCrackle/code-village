def countdown_list(n):
    if n == -1:
        return []
    return [n] + countdown_list(n - 1)
