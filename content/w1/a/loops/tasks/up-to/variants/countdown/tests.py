def test_three():
    expect_equal(learner["countdown"](3), [3, 2, 1], "countdown(3)")

def test_one():
    expect_equal(learner["countdown"](1), [1], "countdown(1)")
