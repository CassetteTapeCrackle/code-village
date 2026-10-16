def test_str():
    expect_equal(str(learner["Mushroom"]("fly agaric", 5)), "fly agaric (5 spots)", 'str(Mushroom("fly agaric", 5))')

def test_eq():
    M = learner["Mushroom"]
    expect_equal((M("cep", 0) == M("cep", 0), M("cep", 0) == M("cep", 2)), (True, False), "two equal mushrooms, then two different ones")
