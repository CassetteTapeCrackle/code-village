def test_three():
    expect_equal(learner["count_items"]([7, 7, 7]), 3, "count_items([7, 7, 7])")

def test_empty():
    expect_equal(learner["count_items"]([]), 0, "count_items([])")
