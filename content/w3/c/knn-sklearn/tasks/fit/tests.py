def test_classify():
    expect_equal(learner["classify"]([[0], [10]], ["cold", "warm"], [[2], [9]]), ["cold", "warm"], "classify([[0], [10]], [cold, warm], [[2], [9]])")
