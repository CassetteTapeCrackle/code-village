def test_middle():
    expect_equal(learner["first_even"]([3, 4, 6]), 4, "first_even([3, 4, 6])")

def test_first():
    expect_equal(learner["first_even"]([2]), 2, "first_even([2])")

def test_none():
    expect_equal(learner["first_even"]([1, 3]), None, "first_even([1, 3])")
