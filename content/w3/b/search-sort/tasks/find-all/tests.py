def test_twice():
    expect_equal(learner["find_all"](["elk", "owl", "elk"], "elk"), [0, 2], 'find_all(["elk", "owl", "elk"], "elk")')

def test_missing():
    expect_equal(learner["find_all"]([1, 2], 5), [], "find_all([1, 2], 5)")
