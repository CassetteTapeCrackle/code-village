def test_summary():
    expect_equal(learner["summary"]([12.0, 15.0, 9.0, 21.0]), {"count": 4, "mean": 14.25, "median": 13.5, "std": 4.44}, "summary([12, 15, 9, 21])")
