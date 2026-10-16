def test_adds_two():
    """add_twice([1], 5) gives [1, 5, 5]"""
    expect_equal(learner["add_twice"]([1], 5), [1, 5, 5], "add_twice([1], 5)")

def test_empty_list():
    expect_equal(learner["add_twice"]([], "a"), ["a", "a"], 'add_twice([], "a")')
