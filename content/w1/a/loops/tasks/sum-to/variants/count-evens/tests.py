def test_mixed():
    expect_equal(learner["count_evens"]([1, 2, 4, 7]), 2, "count_evens([1, 2, 4, 7])")

def test_empty():
    expect_equal(learner["count_evens"]([]), 0, "count_evens([])")

def test_evens_outnumber_odds():
    expect_equal(learner["count_evens"]([2, 4, 6, 1]), 3, "count_evens([2, 4, 6, 1])")
