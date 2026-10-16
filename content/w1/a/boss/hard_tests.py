def test_out_of_range():
    """numbers outside 1 to 100 are not guesses"""
    expect_equal([learner["read_guess"](t) for t in ("0", "101", "-5")], [None, None, None], 'read_guess("0"), ("101") and ("-5")')

def test_leading_zeros():
    expect_equal(learner["read_guess"]("007"), 7, 'read_guess("007")')

def test_mixed_text():
    expect_equal(learner["read_guess"]("12abc"), None, 'read_guess("12abc")')
