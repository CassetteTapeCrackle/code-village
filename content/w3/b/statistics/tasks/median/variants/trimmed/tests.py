def test_trimmed():
    expect_equal(learner["trimmed_mean"]([1, 5, 6, 7, 100]), 6.0, "trimmed_mean([1, 5, 6, 7, 100])")

def test_three():
    expect_equal(learner["trimmed_mean"]([9, 2, 4]), 4.0, "trimmed_mean([9, 2, 4])")

def test_fraction():
    expect_equal(learner["trimmed_mean"]([9, 1, 3, 2]), 2.5, "trimmed_mean([9, 1, 3, 2])")
