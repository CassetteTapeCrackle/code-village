def test_number():
    expect_equal(learner["parse_price"]("2.5"), 2.5, 'parse_price("2.5")')

def test_words():
    expect_equal(learner["parse_price"]("free"), None, 'parse_price("free")')
