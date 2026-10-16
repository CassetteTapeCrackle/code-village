def test_spread():
    expect_equal(learner["spread"]([12, 15, 11, 14, 13]), {"range": 4.0, "std": 1.58}, "spread([12, 15, 11, 14, 13])")
