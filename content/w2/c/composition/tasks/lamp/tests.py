def test_runs_out():
    lamp = learner["Lamp"](2)
    expect_equal([lamp.shine() for _ in range(3)], ["light", "light", "dark"], "a lamp with 2 charges shining three times")
