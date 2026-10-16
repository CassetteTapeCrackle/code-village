def test_average():
    expect_equal(learner["average"]([12, 15, 9]), 12.0, "average([12, 15, 9])")

def test_rounds():
    expect_equal(learner["average"]([10, 11, 11]), 10.67, "average([10, 11, 11])")

def test_empty():
    """no marks gives 0.0, not a crash"""
    expect_equal(learner["average"]([]), 0.0, "average([])")
