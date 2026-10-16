def test_counts():
    R = learner["Ranger"]
    before = R.count
    R("Noa")
    R("Alex")
    expect_equal(R.count - before, 2, "Ranger.count after making two rangers")
