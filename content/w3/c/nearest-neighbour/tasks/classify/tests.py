KNOWN = [((1, 1), "fern"), ((2, 1), "fern"), ((1, 2), "fern"), ((8, 9), "pine"), ((9, 8), "pine"), ((3, 3), "pine")]

def test_ferns_win():
    expect_equal(learner["vote"](KNOWN, (2, 2)), "fern", "vote(KNOWN, (2, 2))")

def test_pines_win():
    expect_equal(learner["vote"](KNOWN, (7, 7)), "pine", "vote(KNOWN, (7, 7))")
