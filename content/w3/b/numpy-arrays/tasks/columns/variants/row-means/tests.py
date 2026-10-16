def test_means():
    expect_equal(learner["row_means"]([[1, 3], [10, 20]]), [2.0, 15.0], "row_means([[1, 3], [10, 20]])")
