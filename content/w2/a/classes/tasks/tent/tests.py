def test_attributes():
    tent = learner["Tent"]("Noa", 2)
    expect_equal((tent.owner, tent.size), ("Noa", 2), 'Tent("Noa", 2): owner and size')

def test_each_tent_its_own():
    a = learner["Tent"]("Sam", 1)
    b = learner["Tent"]("Ines", 4)
    expect_equal((a.owner, b.owner), ("Sam", "Ines"), "two tents keep their own owner")
