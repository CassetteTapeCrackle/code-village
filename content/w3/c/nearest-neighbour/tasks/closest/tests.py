def test_closest():
    expect_equal(learner["closest"]([(0, 0), (5, 5), (9, 1)], (8, 2)), (9, 1), "closest([(0, 0), (5, 5), (9, 1)], (8, 2))")

def test_three_numbers():
    expect_equal(learner["closest"]([(0, 0, 0), (1, 1, 9)], (1, 1, 8)), (1, 1, 9), "closest with 3 features")
