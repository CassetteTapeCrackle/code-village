def test_one():
    expect_equal(learner["label_one"]([[1, 1], [9, 9]], ["fern", "pine"], 8, 7), "pine", "label_one(X, y, 8, 7)")
