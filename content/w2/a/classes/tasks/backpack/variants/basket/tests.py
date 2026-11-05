def test_has():
    b = learner["Basket"]()
    b.put("pear")
    expect_equal((b.has("pear"), b.has("fig")), (True, False), 'put("pear"), then has("pear") and has("fig")')

def test_finds_a_later_fruit():
    basket = learner["Basket"]()
    basket.put("apple")
    basket.put("pear")
    expect_equal((basket.has("pear"), basket.has("plum")), (True, False), "has(pear) and has(plum) after putting apple and pear")
