def count_evens(numbers):
    count = 0
    for n in numbers:
        if n % 2 == 0:
            count = count + 2
    return count
