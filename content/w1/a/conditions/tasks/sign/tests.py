def test_positive():
    expect_equal(learner["sign"](7), "positive", "sign(7)")

def test_negative():
    expect_equal(learner["sign"](-2), "negative", "sign(-2)")

def test_zero():
    expect_equal(learner["sign"](0), "zero", "sign(0)")

def test_next_to_zero():
    expect_equal([learner["sign"](n) for n in (1, -1)], ["positive", "negative"], "sign(1) and sign(-1)")
