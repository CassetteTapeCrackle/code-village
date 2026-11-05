KNOWN = [((1, 1), "fern"), ((2, 1), "fern"), ((1, 2), "fern"), ((8, 9), "pine"), ((9, 8), "pine"), ((3, 3), "pine")]

def test_ferns_win():
    expect_equal(learner["vote"](KNOWN, (2, 2)), "fern", "vote(KNOWN, (2, 2))")

def test_pines_win():
    expect_equal(learner["vote"](KNOWN, (7, 7)), "pine", "vote(KNOWN, (7, 7))")

def test_three_neighbours_vote_not_one_or_all():
    known = [((0, 0), "fern"), ((1, 0), "pine"), ((2, 0), "pine"), ((5, 0), "fern"), ((6, 0), "fern"), ((7, 0), "fern")]
    expect_equal(learner["vote"](known, (0, 0)), "pine", "vote with the nearest three of six, at (0, 0)")
