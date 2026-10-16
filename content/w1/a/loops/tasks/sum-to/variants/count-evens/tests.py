def test_mixed():
    expect_equal(learner["count_evens"]([1, 2, 4, 7]), 2, "count_evens([1, 2, 4, 7])")

def test_empty():
    expect_equal(learner["count_evens"]([]), 0, "count_evens([])")
