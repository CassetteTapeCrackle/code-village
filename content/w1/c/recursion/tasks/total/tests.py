def test_three():
    expect_equal(learner["total"]([1, 2, 3]), 6, "total([1, 2, 3])")

def test_empty():
    expect_equal(learner["total"]([]), 0, "total([])")
