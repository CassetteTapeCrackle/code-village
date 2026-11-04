def test_spread():
    expect_equal(learner["spread"]([12, 15, 11, 14, 13]), {"range": 4.0, "std": 1.58}, "spread([12, 15, 11, 14, 13])")

def test_range_is_a_difference():
    expect_equal(learner["spread"]([2, 10, 4]), {"range": 8.0, "std": 4.16}, "spread([2, 10, 4])")
