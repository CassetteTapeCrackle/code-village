def total(numbers):
    if not numbers:
        return 0
    return numbers[0] + total(numbers[2:])
