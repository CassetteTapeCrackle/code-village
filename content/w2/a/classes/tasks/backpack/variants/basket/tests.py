def test_has():
    b = learner["Basket"]()
    b.put("pear")
    expect_equal((b.has("pear"), b.has("fig")), (True, False), 'put("pear"), then has("pear") and has("fig")')
