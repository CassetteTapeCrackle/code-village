def test_words():
    expect_equal(learner["count_long"](["owl", "lynx", "heron", "ox"]), 2, 'count_long(["owl", "lynx", "heron", "ox"])')

def test_none():
    expect_equal(learner["count_long"](["a"]), 0, 'count_long(["a"])')
