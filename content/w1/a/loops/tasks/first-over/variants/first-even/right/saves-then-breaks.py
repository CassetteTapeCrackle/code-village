def first_even(numbers):
    result = None
    for n in numbers:
        if n % 2 == 0:
            result = n
            break
    return result
