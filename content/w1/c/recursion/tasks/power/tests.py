def test_cube():
    expect_equal(learner["power"](2, 3), 8, "power(2, 3)")

def test_zero():
    expect_equal(learner["power"](5, 0), 1, "power(5, 0)")
