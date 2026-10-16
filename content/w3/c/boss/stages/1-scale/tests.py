def test_scale():
    expect_equal(learner["scale_columns"]([[3000, 0.5], [9000, 9.5], [6000, 5.0]]), [[0.0, 0.0], [1.0, 1.0], [0.5, 0.5]], "scale_columns of three stars")
