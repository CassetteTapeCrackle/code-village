def test_default():
    expect_equal(learner["power"](3), 9, "power(3)")

def test_given():
    expect_equal(learner["power"](2, 5), 32, "power(2, 5)")
