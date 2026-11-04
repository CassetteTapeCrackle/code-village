def sum_to(n):
    return 0 if n == 0 else sum_to(n - 1) + n
