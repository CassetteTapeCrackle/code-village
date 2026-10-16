SPEEDS = [12.0, 15.0, 9.0, 21.0, 30.0]

def test_top():
    expect_equal(learner["top"](SPEEDS, 2), [30.0, 21.0], "top(SPEEDS, 2)")

def test_count_over():
    expect_equal(learner["count_over"](SPEEDS, 14), 3, "count_over(SPEEDS, 14)")
    expect_equal(learner["count_over"](SPEEDS, 50), 0, "count_over(SPEEDS, 50)")
