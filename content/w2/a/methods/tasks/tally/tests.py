def test_add_all():
    t = learner["Tally"]()
    t.add_all([1, 2, 3])
    expect_equal(t.total, 6, "add_all([1, 2, 3]), then total")

def test_mixed():
    t = learner["Tally"]()
    t.add(10)
    t.add_all([5])
    expect_equal(t.total, 15, "add(10), add_all([5]), then total")
