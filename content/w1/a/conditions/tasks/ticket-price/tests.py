def test_small():
    expect_equal(learner["ticket_price"](3), 0, "ticket_price(3)")

def test_child_edges():
    expect_equal([learner["ticket_price"](a) for a in (4, 17)], [5, 5], "ticket_price(4) and ticket_price(17)")

def test_adult_edges():
    expect_equal([learner["ticket_price"](a) for a in (18, 64)], [9, 9], "ticket_price(18) and ticket_price(64)")

def test_senior():
    expect_equal(learner["ticket_price"](65), 6, "ticket_price(65)")
