def clamp(n, low, high):
    return max(low, min(n, high))


def test_clamp():
    assert clamp(-3, 0, 10) == 0
    assert clamp(99, 0, 10) == 10
