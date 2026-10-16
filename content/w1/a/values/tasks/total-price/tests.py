def test_four_buns():
    expect_equal(learner["total_price"](2.5, 4), 10.0, "total_price(2.5, 4)")

def test_none_bought():
    expect_equal(learner["total_price"](3, 0), 0, "total_price(3, 0)")
