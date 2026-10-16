def test_uneven():
    expect_equal(learner["add_lists"]([1, 2, 3], [10, 20]), [11, 22, 3], "add_lists([1, 2, 3], [10, 20])")

def test_even():
    expect_equal(learner["add_lists"]([1], [1]), [2], "add_lists([1], [1])")
