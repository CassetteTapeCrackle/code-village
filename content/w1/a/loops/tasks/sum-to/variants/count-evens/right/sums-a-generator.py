def count_evens(numbers):
    return sum(1 for n in numbers if n % 2 == 0)
