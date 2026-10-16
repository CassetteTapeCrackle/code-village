def test_restock():
    inv = learner["Inventory"]("acorns", 4, 3)
    inv.restock(6)
    expect_equal((inv.stock, inv.value()), (10, 30), "restock(6) on 4 acorns at 3")

def test_after_selling():
    inv = learner["Inventory"]("acorns", 4, 3)
    inv.sell(1)
    expect_equal(inv.value(), 9, "value() after selling 1 of 4 at 3")
