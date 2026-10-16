def test_doubled():
    expect_equal(learner["doubled"]([1, 2, 3]), [2, 4, 6], "doubled([1, 2, 3])")

def test_empty():
    expect_equal(learner["doubled"]([]), [], "doubled([])")
