def test_fruit():
    expect_equal(learner["sort_by_length"](["banana", "fig", "kiwi"]), ["fig", "kiwi", "banana"], 'sort_by_length(["banana", "fig", "kiwi"])')

def test_ties_keep_order():
    """words of the same length keep their order"""
    expect_equal(learner["sort_by_length"](["bb", "aa", "c"]), ["c", "bb", "aa"], 'sort_by_length(["bb", "aa", "c"])')
