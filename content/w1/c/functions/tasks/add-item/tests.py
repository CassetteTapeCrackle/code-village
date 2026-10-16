def test_fresh_list():
    """each call without a list starts a new one"""
    learner["add_item"]("tea")
    expect_equal(learner["add_item"]("jam"), ["jam"], 'add_item("jam") after add_item("tea")')

def test_given_list():
    expect_equal(learner["add_item"]("x", ["a"]), ["a", "x"], 'add_item("x", ["a"])')
