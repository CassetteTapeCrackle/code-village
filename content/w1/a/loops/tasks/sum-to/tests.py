def test_four():
    expect_equal(learner["sum_to"](4), 10, "sum_to(4)")

def test_one():
    expect_equal(learner["sum_to"](1), 1, "sum_to(1)")

def test_zero():
    expect_equal(learner["sum_to"](0), 0, "sum_to(0)")
