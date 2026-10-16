def test_glass():
    w = learner["Window"](2, 3)
    first = w.glass
    w.height = 4
    expect_equal((first, w.glass), (6, 8), "Window(2, 3).glass, then after height = 4")
