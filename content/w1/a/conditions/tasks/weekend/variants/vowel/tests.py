def test_vowels():
    expect_equal([learner["is_vowel"](c) for c in "aeu"], [True, True, True], 'is_vowel("a"), ("e") and ("u")')

def test_consonant():
    expect_equal(learner["is_vowel"]("b"), False, 'is_vowel("b")')
