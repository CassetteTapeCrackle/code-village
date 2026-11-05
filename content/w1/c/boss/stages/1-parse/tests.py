def test_two_words():
    expect_equal(learner["parse"]("go north"), ("go", "north"), 'parse("go north")')

def test_capitals():
    expect_equal(learner["parse"]("Take Lamp"), ("take", "lamp"), 'parse("Take Lamp")')

def test_one_word():
    expect_equal(learner["parse"]("look"), ("look", ""), 'parse("look")')

def test_empty():
    expect_equal(learner["parse"](""), ("", ""), 'parse("")')

def test_lower_case_exactly():
    """the verb and noun come back in lower case, not just equal ignoring case"""
    expect_equal(learner["parse"]("Take Lamp") == ("take", "lamp"), True, 'parse("Take Lamp") == ("take", "lamp")')
