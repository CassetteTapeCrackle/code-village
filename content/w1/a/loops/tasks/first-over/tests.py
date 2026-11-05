def test_middle():
    expect_equal(learner["first_over"]([3, 8, 12, 20], 10), 12, "first_over([3, 8, 12, 20], 10)")

def test_none():
    expect_equal(learner["first_over"]([1, 2], 5), None, "first_over([1, 2], 5)")

def test_first():
    expect_equal(learner["first_over"]([11], 10), 11, "first_over([11], 10)")

def test_equal_is_not_over():
    expect_equal(learner["first_over"]([10, 12], 10), 12, "first_over([10, 12], 10)")
