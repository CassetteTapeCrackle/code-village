def test_sell_nothing():
    """selling 0 is fine and changes nothing"""
    inv = learner["Inventory"]("acorns", 5, 2)
    expect_equal((inv.sell(0), inv.stock, inv.revenue), (True, 5, 0), "sell(0)")

def test_sell_everything():
    inv = learner["Inventory"]("acorns", 5, 2)
    expect_equal((inv.sell(5), inv.stock, inv.value()), (True, 0, 0), "selling the whole stock")

def test_two_storehouses():
    """two inventories keep their own books"""
    a = learner["Inventory"]("acorns", 5, 2)
    b = learner["Inventory"]("hazelnuts", 9, 3)
    a.sell(2)
    expect_equal((b.stock, b.sales, b.revenue), (9, 0, 0), "the hazelnuts after selling acorns")

def test_sales_add_up():
    """two sales add to the totals instead of replacing them"""
    inv = learner["Inventory"]("acorns", 10, 2)
    inv.sell(2)
    inv.sell(3)
    expect_equal((inv.stock, inv.sales, inv.revenue), (5, 5, 10), "sell(2), then sell(3), from 10 acorns at 2")
