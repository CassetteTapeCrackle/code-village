def test_vote():
    X = [[1], [2], [3], [4], [20]]
    y = ["low", "low", "high", "low", "high"]
    expect_equal(learner["vote_labels"](X, y, [[3], [20]]), ["low", "high"], "vote_labels(X, y, [[3], [20]])")

def test_three_vote_not_four():
    expect_equal(learner["vote_labels"]([[0], [1], [2], [3]], ["a", "a", "b", "b"], [[1.6]]), ["b"], "vote_labels([[0], [1], [2], [3]], [a, a, b, b], [[1.6]])")
