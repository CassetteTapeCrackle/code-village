def test_some():
    expect_equal(learner["long_words"](["fig", "pear", "kiwi", "yam"]), ["pear", "kiwi"], 'long_words(["fig", "pear", "kiwi", "yam"])')

def test_none():
    expect_equal(learner["long_words"](["a", "bb"]), [], 'long_words(["a", "bb"])')
