def odd_squares(numbers):
    result = []
    for n in numbers:
        if n % 2 == 1:
            result.append(n ** 2)
    return result
