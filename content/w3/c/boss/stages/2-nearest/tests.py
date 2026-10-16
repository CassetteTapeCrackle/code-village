def test_nearest():
    X = [[0.1, 0.1], [0.9, 0.8], [0.5, 0.5]]
    y = ["dwarf", "giant", "sunlike"]
    expect_equal(learner["nearest_label"](X, y, [0.8, 0.9]), "giant", "nearest_label(X, y, [0.8, 0.9])")
    expect_equal(learner["nearest_label"](X, y, [0.4, 0.6]), "sunlike", "nearest_label(X, y, [0.4, 0.6])")
