def test_counts():
    L = learner["Lantern"]
    before = L.made
    L("red")
    L("blue")
    L("green")
    expect_equal(L.made - before, 3, "Lantern.made after three lanterns")
