def test_vote():
    X = [[0.1], [0.2], [0.3], [0.8], [0.9]]
    y = ["dwarf", "dwarf", "giant", "giant", "giant"]
    expect_equal(learner["knn_predict"](X, y, [[0.15], [0.85]], 1), ["dwarf", "giant"], "knn_predict with k=1")
    expect_equal(learner["knn_predict"](X, y, [[0.15]], 5), ["giant"], "knn_predict with k=5")
