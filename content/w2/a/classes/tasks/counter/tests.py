def test_adds_up():
    c = learner["Counter"]()
    c.add(2)
    c.add(3)
    expect_equal(c.total, 5, "Counter(), add(2), add(3), then total")

def test_starts_at_zero():
    expect_equal(learner["Counter"]().total, 0, "Counter().total")
