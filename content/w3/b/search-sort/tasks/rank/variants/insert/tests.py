def test_insert():
    values = [1, 4, 9]
    expect_equal(learner["with_new"](values, 5), [1, 4, 5, 9], "with_new([1, 4, 9], 5)")
    expect_equal(values, [1, 4, 9], "the original list after with_new")
