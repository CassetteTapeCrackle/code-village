def test_wingspan():
    expect_equal(learner["Bird"](30).wingspan, 30, "Bird(30).wingspan")

def test_zero():
    """0 raises ValueError"""
    try:
        learner["Bird"](0)
    except ValueError:
        return
    raise Failure("Bird(0) should raise ValueError")

def test_negative():
    """a negative wingspan raises ValueError"""
    try:
        learner["Bird"](-5)
    except ValueError:
        return
    raise Failure("Bird(-5) should raise ValueError")

def test_smallest_whole_span():
    expect_equal(learner["Bird"](1).wingspan, 1, "Bird(1).wingspan")
