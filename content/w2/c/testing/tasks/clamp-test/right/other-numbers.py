def clamp(n, low, high):
    return max(low, min(n, high))


def test_clamp():
    assert clamp(7, 1, 9) == 7
    assert clamp(-5, 1, 9) == 1
    assert clamp(20, 1, 9) == 9
