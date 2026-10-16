def test_stores():
    s = learner["Radio"](3)
    s.volume = 9
    expect_equal(s.volume, 9, "Radio(3), then volume = 9")

def test_limits_allowed():
    s = learner["Radio"](3)
    s.volume = 0
    first = s.volume
    s.volume = 10
    expect_equal((first, s.volume), (0, 10), "volume = 0, then volume = 10 (the limits are allowed)")

def test_refuses_above():
    """values above 10 raise ValueError"""
    s = learner["Radio"](3)
    try:
        s.volume = 11
    except ValueError:
        return
    raise Failure("setting volume to 11 should raise ValueError")

def test_refuses_below():
    """values below 0 raise ValueError, from __init__ too"""
    try:
        learner["Radio"](-1)
    except ValueError:
        return
    raise Failure("Radio(-1) should raise ValueError")
