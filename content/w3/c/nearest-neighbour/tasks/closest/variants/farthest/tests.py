def test_farthest():
    expect_equal(learner["farthest"]([(0, 0), (5, 5), (9, 1)], (1, 1)), (9, 1), "farthest([(0, 0), (5, 5), (9, 1)], (1, 1))")
