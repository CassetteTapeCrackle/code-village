def test_three_and_four():
    expect_equal(learner["add_strings"]("3", "4"), 7, 'add_strings("3", "4")')

def test_negative():
    expect_equal(learner["add_strings"]("10", "-2"), 8, 'add_strings("10", "-2")')
