def test_attributes():
    inv = learner["Inventory"]("acorns", 10, 2)
    expect_equal((inv.product, inv.stock, inv.price, inv.sales, inv.revenue), ("acorns", 10, 2, 0, 0), 'Inventory("acorns", 10, 2)')
