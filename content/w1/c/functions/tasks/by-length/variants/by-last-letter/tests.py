def test_three():
    expect_equal(learner["sort_by_last"](["sun", "tea", "jam"]), ["tea", "jam", "sun"], 'sort_by_last(["sun", "tea", "jam"])')

def test_one():
    expect_equal(learner["sort_by_last"](["ab"]), ["ab"], 'sort_by_last(["ab"])')
