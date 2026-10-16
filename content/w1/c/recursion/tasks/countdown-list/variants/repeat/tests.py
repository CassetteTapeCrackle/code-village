def test_three():
    expect_equal(learner["repeat"]("hi", 3), ["hi", "hi", "hi"], 'repeat("hi", 3)')

def test_zero():
    expect_equal(learner["repeat"]("x", 0), [], 'repeat("x", 0)')
