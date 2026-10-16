def test_colours():
    n = learner["Nest"]()
    n.lay(learner["Egg"]("blue"))
    n.lay(learner["Egg"]("speckled"))
    expect_equal(n.colours(), ["blue", "speckled"], "lay a blue then a speckled egg")
