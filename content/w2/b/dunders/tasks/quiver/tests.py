def test_len():
    expect_equal(len(learner["Quiver"](["oak", "ash"])), 2, 'len(Quiver(["oak", "ash"]))')

def test_empty_is_false():
    expect_equal(bool(learner["Quiver"]([])), False, "bool(Quiver([]))")
