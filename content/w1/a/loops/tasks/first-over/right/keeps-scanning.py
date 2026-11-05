def first_over(numbers, limit):
    found = None
    for n in numbers:
        if n > limit:
            if found is None:
                found = n
    return found
