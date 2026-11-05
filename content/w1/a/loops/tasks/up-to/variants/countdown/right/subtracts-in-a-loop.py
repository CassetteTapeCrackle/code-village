def countdown(n):
    numbers = list(range(n))
    i = 0
    while i < n:
        numbers[i] = n - i
        i = i + 1
    return numbers
