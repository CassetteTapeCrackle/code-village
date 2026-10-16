def average(numbers):
    if len(numbers) == 0:
        raise ValueError("no numbers")
    return sum(numbers) / len(numbers)


def raises_value_error(f, arg):
    try:
        f(arg)
    except ValueError:
        return True
    return False


def test_average():
    assert average([2, 4]) == 3
    assert average([5]) == 5
    assert raises_value_error(average, [])
