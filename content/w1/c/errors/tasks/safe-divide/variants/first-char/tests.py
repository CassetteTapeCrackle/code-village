def test_word():
    expect_equal(learner["first_char"]("owl"), "o", 'first_char("owl")')

def test_empty():
    expect_equal(learner["first_char"](""), None, 'first_char("")')
