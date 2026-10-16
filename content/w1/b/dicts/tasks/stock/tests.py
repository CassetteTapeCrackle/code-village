def test_known():
    expect_equal(learner["in_stock"]({"tea": 4}, "tea"), 4, 'in_stock({"tea": 4}, "tea")')

def test_unknown():
    expect_equal(learner["in_stock"]({"tea": 4}, "jam"), 0, 'in_stock({"tea": 4}, "jam")')
