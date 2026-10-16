def test_number():
    expect_equal(learner["parse_age"]("12"), 12, 'parse_age("12")')

def test_word():
    expect_equal(learner["parse_age"]("twelve"), None, 'parse_age("twelve")')
