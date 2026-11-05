def test_vowels():
    expect_equal([learner["is_vowel"](c) for c in "aeiou"], [True] * 5, 'is_vowel("a"), ("e"), ("i"), ("o") and ("u")')

def test_consonants():
    expect_equal([learner["is_vowel"](c) for c in "bfz"], [False] * 3, 'is_vowel("b"), ("f") and ("z")')
