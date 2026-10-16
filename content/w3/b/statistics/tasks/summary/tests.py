def test_temps():
    expect_equal(learner["summary"]([12, 15, 11, 14, 13]), {"mean": 13.0, "median": 13.0, "std": 1.41}, "summary([12, 15, 11, 14, 13])")

def test_same_values():
    expect_equal(learner["summary"]([4, 4]), {"mean": 4.0, "median": 4.0, "std": 0.0}, "summary([4, 4])")
