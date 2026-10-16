def test_whole():
    expect_equal(learner["average_of_two"](2, 4), 3.0, "average_of_two(2, 4)")

def test_half():
    expect_equal(learner["average_of_two"](1, 2), 1.5, "average_of_two(1, 2)")
