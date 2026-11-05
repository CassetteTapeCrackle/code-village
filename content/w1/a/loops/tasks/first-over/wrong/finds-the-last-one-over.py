def first_over(numbers, limit):
    found = None
    for n in numbers:
        if n > limit:
            found = n
    return found
