def test_tea():
    expect_equal(learner["price_label"]("tea", 2.5), "Price of tea: 2.5", 'price_label("tea", 2.5)')

def test_jam():
    expect_equal(learner["price_label"]("jam", 4), "Price of jam: 4", 'price_label("jam", 4)')
