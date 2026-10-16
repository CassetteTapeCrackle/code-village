def test_fine():
    expect_equal(learner["set_volume"](7), 7, "set_volume(7)")

def test_too_loud():
    """above 10 raises ValueError"""
    try:
        learner["set_volume"](11)
    except ValueError:
        return
    raise Failure("set_volume(11) should raise ValueError")

def test_below_zero():
    """below 0 raises ValueError"""
    try:
        learner["set_volume"](-1)
    except ValueError:
        return
    raise Failure("set_volume(-1) should raise ValueError")
