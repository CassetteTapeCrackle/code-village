def first_over(numbers, limit):
    return next((n for n in numbers if n > limit), None)
