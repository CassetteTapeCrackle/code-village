def clamp(n, low, high):
    return max(low, min(n, high))


def test_clamp():
    assert clamp(5, 0, 10) == 5
