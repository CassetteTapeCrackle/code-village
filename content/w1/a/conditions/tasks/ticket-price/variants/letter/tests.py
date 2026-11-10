def test_top():
    expect_equal([learner["letter"](s) for s in (16, 15, 12)], ["A", "B", "B"], "letter(16), (15) and (12)")

def test_low():
    expect_equal([learner["letter"](s) for s in (11, 10, 9)], ["C", "C", "F"], "letter(11), (10) and (9)")

def test_above_the_top():
    expect_equal([learner["letter"](s) for s in (17, 20, 100)], ["A", "A", "A"], "letter(17), (20) and (100)")
