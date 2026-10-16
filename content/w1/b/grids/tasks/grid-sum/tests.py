def test_square():
    expect_equal(learner["grid_sum"]([[1, 2], [3, 4]]), 10, "grid_sum([[1, 2], [3, 4]])")

def test_single():
    expect_equal(learner["grid_sum"]([[5]]), 5, "grid_sum([[5]])")

def test_empty():
    expect_equal(learner["grid_sum"]([]), 0, "grid_sum([])")
