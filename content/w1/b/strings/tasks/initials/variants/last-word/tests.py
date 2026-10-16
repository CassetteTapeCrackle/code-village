def test_sentence():
    expect_equal(learner["last_word"]("the quick fox"), "fox", 'last_word("the quick fox")')

def test_single():
    expect_equal(learner["last_word"]("solo"), "solo", 'last_word("solo")')
