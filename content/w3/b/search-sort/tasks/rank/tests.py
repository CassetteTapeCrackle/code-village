def test_middle():
    expect_equal(learner["rank"]([31, 35, 40, 52], 38), 2, "rank([31, 35, 40, 52], 38)")

def test_fastest():
    expect_equal(learner["rank"]([31, 35], 20), 0, "rank([31, 35], 20)")

def test_tie_is_not_faster():
    expect_equal(learner["rank"]([31, 35, 40], 35), 1, "rank([31, 35, 40], 35)")
