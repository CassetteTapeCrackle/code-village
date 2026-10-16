def test_overlap():
    expect_equal(learner["in_both"]([3, 1, 2, 3], [3, 2, 5]), [2, 3], "in_both([3, 1, 2, 3], [3, 2, 5])")

def test_nothing_shared():
    expect_equal(learner["in_both"]([1], [2]), [], "in_both([1], [2])")
