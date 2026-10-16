def test_two():
    expect_equal(learner["diagonal"]([[1, 2], [3, 4]]), [1, 4], "diagonal([[1, 2], [3, 4]])")

def test_one():
    expect_equal(learner["diagonal"]([[5]]), [5], "diagonal([[5]])")
