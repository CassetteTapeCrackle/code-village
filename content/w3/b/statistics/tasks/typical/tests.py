def test_outlier():
    expect_equal(learner["typical_price"]([3, 4, 3, 5, 90]), 4.0, "typical_price([3, 4, 3, 5, 90])")

def test_even():
    expect_equal(learner["typical_price"]([2, 4, 6, 100]), 5.0, "typical_price([2, 4, 6, 100])")
