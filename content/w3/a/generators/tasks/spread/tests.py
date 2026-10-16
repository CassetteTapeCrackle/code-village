def test_spread():
    expect_equal(learner["spread"]([3, 9, 4]), 6, "spread([3, 9, 4])")

def test_one_number():
    expect_equal(learner["spread"]([5]), 0, "spread([5])")
