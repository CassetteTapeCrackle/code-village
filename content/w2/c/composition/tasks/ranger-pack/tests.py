def test_has_a_pack():
    r = learner["Ranger"]("Noa")
    r.pack.add("rope")
    expect_equal((r.name, r.pack.items), ("Noa", ["rope"]), 'Ranger("Noa").pack.add("rope")')

def test_is_not_a_backpack():
    expect_equal(isinstance(learner["Ranger"]("Sam"), learner["Backpack"]), False, "isinstance(ranger, Backpack)")
