def sum_to(n):
    if n == 0:
        return 1
    return n + sum_to(n - 1)
