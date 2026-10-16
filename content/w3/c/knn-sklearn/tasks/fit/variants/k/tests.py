def test_crowd():
    X = [[1], [2], [3], [10], [11]]
    y = ["low", "low", "low", "high", "high"]
    expect_equal(learner["crowd"](X, y, [[10]]), ["low"], "crowd(X, y, [[10]]) with 5 voting")
