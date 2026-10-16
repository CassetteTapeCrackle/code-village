def test_words():
    expect_equal(learner["total_letters"](["owl", "lynx", "ox"]), 9, 'total_letters(["owl", "lynx", "ox"])')

def test_empty():
    expect_equal(learner["total_letters"]([]), 0, "total_letters([])")
