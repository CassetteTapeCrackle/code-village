def first_over(numbers, limit):
    for n in numbers:
        if n > limit:
            return n
    return None
