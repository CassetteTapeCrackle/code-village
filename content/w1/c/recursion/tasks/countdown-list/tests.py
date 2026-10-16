def test_three():
    expect_equal(learner["countdown_list"](3), [3, 2, 1], "countdown_list(3)")

def test_zero():
    expect_equal(learner["countdown_list"](0), [], "countdown_list(0)")
