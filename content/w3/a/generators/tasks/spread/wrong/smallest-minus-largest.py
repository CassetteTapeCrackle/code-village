def spread(numbers):
    values = [n for n in numbers]
    return min(values) - max(values)
