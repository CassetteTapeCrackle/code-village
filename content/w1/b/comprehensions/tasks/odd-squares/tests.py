def test_mixed():
    expect_equal(learner["odd_squares"]([1, 2, 3]), [1, 9], "odd_squares([1, 2, 3])")

def test_empty():
    expect_equal(learner["odd_squares"]([]), [], "odd_squares([])")
