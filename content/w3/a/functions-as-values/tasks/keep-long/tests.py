def test_some():
    expect_equal(learner["long_words"](["ice", "glacier", "snow", "avalanche"], 4), ["glacier", "avalanche"], 'long_words([...], 4)')

def test_none():
    expect_equal(learner["long_words"](["a", "bb"], 5), [], 'long_words(["a", "bb"], 5)')

def test_exactly_n_is_not_longer():
    expect_equal(learner["long_words"](["four", "fives"], 4), ["fives"], 'long_words(["four", "fives"], 4)')
