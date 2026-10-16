def test_two_words():
    expect_equal(learner["initials"]("noa river"), "NR", 'initials("noa river")')

def test_one_word():
    expect_equal(learner["initials"]("Sam"), "S", 'initials("Sam")')

def test_four_words():
    expect_equal(learner["initials"]("ines de la mar"), "IDLM", 'initials("ines de la mar")')
