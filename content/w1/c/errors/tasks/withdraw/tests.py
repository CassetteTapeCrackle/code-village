def test_enough():
    expect_equal(learner["withdraw"](10, 3), 7, "withdraw(10, 3)")

def test_refuses():
    """asking for too much raises ValueError"""
    try:
        learner["withdraw"](5, 8)
    except ValueError:
        return
    raise Failure("withdraw(5, 8) should raise ValueError")
