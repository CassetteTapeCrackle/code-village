def first(items):
    return items[0]


def raises_index_error(f, arg):
    try:
        f(arg)
    except IndexError:
        return True
    return False


def test_first():
    assert first(["a", "b"]) == "a"
    assert raises_index_error(first, [])
