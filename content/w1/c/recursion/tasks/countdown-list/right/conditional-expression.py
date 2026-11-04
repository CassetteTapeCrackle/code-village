def countdown_list(n):
    return [n] + countdown_list(n - 1) if n else []
