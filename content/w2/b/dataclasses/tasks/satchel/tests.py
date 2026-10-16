def test_own_items():
    a = learner["Satchel"]("Noa")
    b = learner["Satchel"]("Sam")
    a.items.append("lamp")
    expect_equal((a.items, b.items), (["lamp"], []), "two satchels, a lamp in the first")
