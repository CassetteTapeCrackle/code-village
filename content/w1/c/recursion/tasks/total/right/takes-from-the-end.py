def total(numbers):
    if not numbers:
        return 0
    return total(numbers[:-1]) + numbers[-1]
