def first_even(numbers):
    evens = [n for n in numbers if n % 2 == 0]
    return evens[0] if evens else None
