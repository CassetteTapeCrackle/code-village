def test_sells():
    inv = learner["Inventory"]("acorns", 10, 2)
    expect_equal((inv.sell(3), inv.stock, inv.sales, inv.revenue), (True, 7, 3, 6), "sell(3) from 10 acorns at 2")

def test_not_enough():
    inv = learner["Inventory"]("acorns", 2, 2)
    expect_equal((inv.sell(5), inv.stock, inv.sales, inv.revenue), (False, 2, 0, 0), "sell(5) from 2 acorns")
