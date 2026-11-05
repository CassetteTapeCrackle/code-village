def power(base, exponent=2):
    result = 1
    for _ in range(exponent):
        result = result * base
    return result
