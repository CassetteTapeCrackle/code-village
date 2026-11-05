def test_divides():
    expect_equal(learner["safe_divide"](6, 3), 2.0, "safe_divide(6, 3)")

def test_by_zero():
    expect_equal(learner["safe_divide"](1, 0), None, "safe_divide(1, 0)")

def test_fraction():
    expect_equal(learner["safe_divide"](7, 2), 3.5, "safe_divide(7, 2)")
