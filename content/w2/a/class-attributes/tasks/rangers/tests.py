def test_counts():
    R = learner["Ranger"]
    expect_equal(R.count, 0, "Ranger.count before any ranger")
    R("Noa")
    R("Alex")
    expect_equal(R.count, 2, "Ranger.count after making two rangers")

def test_keeps_its_name():
    expect_equal(learner["Ranger"]("Noa").name, "Noa", "the name of Ranger('Noa')")
