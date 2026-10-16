def test_wait():
    expect_equal(learner["typical_wait"]([5, 6, 4, 120, 5]), 5.0, "typical_wait([5, 6, 4, 120, 5])")
