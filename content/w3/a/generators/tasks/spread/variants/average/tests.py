def test_average():
    expect_equal(learner["average"]([2, 4, 9]), 5.0, "average([2, 4, 9])")

def test_fraction():
    expect_equal(learner["average"]([1, 2]), 1.5, "average([1, 2])")
