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
    assert average([6, 8]) == 7
    assert average([9]) == 9
    assert raises_value_error(average, [])
