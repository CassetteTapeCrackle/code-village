def test_runs_down():
    t = learner["Torch"](10)
    t.use(4)
    expect_equal((t.battery, t.is_empty()), (6, False), "Torch(10), use(4), then battery and is_empty()")

def test_never_below_zero():
    t = learner["Torch"](5)
    t.use(8)
    expect_equal((t.battery, t.is_empty()), (0, True), "Torch(5), use(8), then battery and is_empty()")
