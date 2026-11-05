def sum_to(n):
    if n == 0:
        return 0
    smaller = sum_to(n - 1)
    return n + smaller
