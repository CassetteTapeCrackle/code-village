def test_hey():
    expect_equal(learner["shout"]("hey"), "HEY!", 'shout("hey")')

def test_two_words():
    expect_equal(learner["shout"]("Hi there"), "HI THERE!", 'shout("Hi there")')
