def test_too_big():
    expect_equal(learner["hint"](42, 50), "lower", "hint(42, 50)")

def test_too_small():
    expect_equal(learner["hint"](42, 10), "higher", "hint(42, 10)")

def test_right():
    expect_equal(learner["hint"](42, 42), "correct", "hint(42, 42)")
