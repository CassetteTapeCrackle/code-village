def test_noon():
    expect_equal(learner["letter_counts"]("noon"), {"n": 2, "o": 2}, 'letter_counts("noon")')

def test_empty():
    expect_equal(learner["letter_counts"](""), {}, 'letter_counts("")')
