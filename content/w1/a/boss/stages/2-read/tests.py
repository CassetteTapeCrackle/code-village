def test_number():
    expect_equal(learner["read_guess"]("42"), 42, 'read_guess("42")')

def test_spaces():
    expect_equal(learner["read_guess"](" 7 "), 7, 'read_guess(" 7 ")')

def test_not_numbers():
    """words, decimals and empty lines give None"""
    expect_equal([learner["read_guess"](t) for t in ("seven", "4.5", "")], [None, None, None], 'read_guess("seven"), ("4.5") and ("")')

def test_out_of_range():
    """only 1 to 100 are guesses"""
    expect_equal([learner["read_guess"](t) for t in ("0", "101")], [None, None], 'read_guess("0") and ("101")')
