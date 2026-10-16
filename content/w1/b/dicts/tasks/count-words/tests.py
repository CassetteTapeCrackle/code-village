def test_repeats():
    expect_equal(learner["count_words"]("a b a"), {"a": 2, "b": 1}, 'count_words("a b a")')

def test_empty():
    expect_equal(learner["count_words"](""), {}, 'count_words("")')
