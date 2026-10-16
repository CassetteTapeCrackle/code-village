def test_vote():
    X = [[1], [2], [3], [4], [20]]
    y = ["low", "low", "high", "low", "high"]
    expect_equal(learner["vote_labels"](X, y, [[3], [20]]), ["low", "high"], "vote_labels(X, y, [[3], [20]])")
