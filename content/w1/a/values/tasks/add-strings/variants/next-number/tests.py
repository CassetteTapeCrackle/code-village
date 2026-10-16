def test_forty_one():
    expect_equal(learner["next_number"]("41"), 42, 'next_number("41")')

def test_negative():
    expect_equal(learner["next_number"]("-1"), 0, 'next_number("-1")')
