def test_three():
    expect_equal(learner["up_to"](3), [1, 2, 3], "up_to(3)")

def test_one():
    expect_equal(learner["up_to"](1), [1], "up_to(1)")
