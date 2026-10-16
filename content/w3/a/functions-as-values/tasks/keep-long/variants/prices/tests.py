def test_prices():
    expect_equal(learner["with_tax"]([2, 4, 10]), [3.0, 6.0, 15.0], "with_tax([2, 4, 10])")

def test_empty():
    expect_equal(learner["with_tax"]([]), [], "with_tax([])")
