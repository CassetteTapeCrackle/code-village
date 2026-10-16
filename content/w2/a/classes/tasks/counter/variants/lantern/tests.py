def test_lights():
    lamp = learner["Lantern"]()
    lamp.light()
    expect_equal(lamp.lit, True, "Lantern(), light(), then lit")

def test_starts_dark():
    expect_equal(learner["Lantern"]().lit, False, "Lantern().lit")
