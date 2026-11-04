def test_wingspan():
    expect_equal((learner["Bird"](30).wingspan, learner["Bird"](1).wingspan), (30, 1), "Bird(30).wingspan and Bird(1).wingspan")

def test_zero_and_below_raise():
    """0 and negative wingspans raise ValueError"""
    for span in (0, -5):
        try:
            learner["Bird"](span)
        except ValueError:
            continue
        raise Failure(f"Bird({span}) should raise ValueError")
