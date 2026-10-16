def test_two():
    expect_equal(learner["shout_all"](["tea", "jam"]), ["TEA!", "JAM!"], 'shout_all(["tea", "jam"])')

def test_empty():
    expect_equal(learner["shout_all"]([]), [], "shout_all([])")
