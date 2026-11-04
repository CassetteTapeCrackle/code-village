def power(base, exp):
    return 1 if exp == 0 else base * power(base, exp - 1)
