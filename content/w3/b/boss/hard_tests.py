def test_all_bad():
    """a log with no usable reading: clean gives [], summary gives count 0 and None for the rest, count_over gives 0"""
    speeds = learner["clean"](["06:00,", "07:00,calm"])
    expect_equal(speeds, [], "clean on a log with no numbers")
    expect_equal(learner["summary"](speeds), {"count": 0, "mean": None, "median": None, "std": None}, "summary([])")
    expect_equal(learner["count_over"]([], 10), 0, "count_over([], 10)")

def test_one_reading():
    """one reading: it is its own mean and median, with a spread of 0.0"""
    expect_equal(learner["summary"]([7.0]), {"count": 1, "mean": 7.0, "median": 7.0, "std": 0.0}, "summary([7.0])")

def test_ties():
    """a gust equal to the limit is not over it, and tied gusts both count"""
    expect_equal(learner["count_over"]([10.0, 12.0, 12.0, 9.0], 10), 2, "count_over([10, 12, 12, 9], 10)")
    expect_equal(learner["top"]([12.0, 9.0, 12.0], 2), [12.0, 12.0], "top([12, 9, 12], 2)")

def test_rounding():
    """the mean and the spread are rounded to 2 decimals, not 3"""
    expect_equal(learner["summary"]([1.0, 2.0, 2.0]), {"count": 3, "mean": 1.67, "median": 2.0, "std": 0.47}, "summary([1, 2, 2])")
