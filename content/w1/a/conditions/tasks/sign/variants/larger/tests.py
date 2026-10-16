def test_first():
    expect_equal(learner["larger"](9, 4), 9, "larger(9, 4)")

def test_second():
    expect_equal(learner["larger"](-1, 3), 3, "larger(-1, 3)")

def test_equal():
    expect_equal(learner["larger"](5, 5), 5, "larger(5, 5)")
