def test_order():
    """a comes before b"""
    expect_equal(learner["add_both"]([0], 1, 2), [0, 1, 2], "add_both([0], 1, 2)")

def test_empty_list():
    expect_equal(learner["add_both"]([], "x", "y"), ["x", "y"], 'add_both([], "x", "y")')
