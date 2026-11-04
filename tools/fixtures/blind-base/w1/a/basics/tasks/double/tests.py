def test_four():
    expect_equal(learner["double"](2), 4, "double(2)")

def test_zero():
    expect_equal(learner["double"](0), 0, "double(0)")
