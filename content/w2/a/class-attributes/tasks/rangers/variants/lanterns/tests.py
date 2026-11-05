def test_counts():
    L = learner["Lantern"]
    expect_equal(L.made, 0, "Lantern.made before any lantern")
    L("red")
    L("blue")
    L("green")
    expect_equal(L.made, 3, "Lantern.made after three lanterns")

def test_keeps_its_colour():
    expect_equal(learner["Lantern"]("red").colour, "red", "the colour of Lantern('red')")
