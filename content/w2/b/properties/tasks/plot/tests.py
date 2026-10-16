def test_values():
    p = learner["Plot"](3, 4)
    expect_equal((p.area, p.fence), (12, 14), "Plot(3, 4): area and fence")

def test_up_to_date():
    p = learner["Plot"](3, 4)
    p.width = 5
    expect_equal((p.area, p.fence), (20, 18), "after setting width to 5")
