def test_stores():
    s = learner["Stove"](40)
    s.fuel = 99
    expect_equal(s.fuel, 99, "Stove(40), then fuel = 99")

def test_limits_allowed():
    s = learner["Stove"](40)
    s.fuel = 0
    first = s.fuel
    s.fuel = 100
    expect_equal((first, s.fuel), (0, 100), "fuel = 0, then fuel = 100 (the limits are allowed)")

def test_refuses_above():
    """values above 100 raise ValueError"""
    s = learner["Stove"](40)
    try:
        s.fuel = 101
    except ValueError:
        return
    raise Failure("setting fuel to 101 should raise ValueError")

def test_refuses_below():
    """values below 0 raise ValueError, from __init__ too"""
    try:
        learner["Stove"](-1)
    except ValueError:
        return
    raise Failure("Stove(-1) should raise ValueError")
