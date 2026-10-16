def test_wingspan():
    expect_equal(learner["Bird"](30).wingspan, 30, "Bird(30).wingspan")

def test_zero():
    """0 raises ValueError"""
    try:
        learner["Bird"](0)
    except ValueError:
        return
    raise Failure("Bird(0) should raise ValueError")
