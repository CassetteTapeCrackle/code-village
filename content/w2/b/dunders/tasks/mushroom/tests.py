def test_str():
    expect_equal(str(learner["Mushroom"]("fly agaric", 5)), "fly agaric (5 spots)", 'str(Mushroom("fly agaric", 5))')

def test_eq():
    M = learner["Mushroom"]
    expect_equal((M("cep", 0) == M("cep", 0), M("cep", 0) == M("cep", 2)), (True, False), "two equal mushrooms, then two different ones")

def test_eq_compares_values_both_ways():
    M = learner["Mushroom"]
    built = M("".join(["fly ", "agaric"]), int("1000"))
    expect_equal(
        (built == M("fly agaric", 1000), M("cep", 3) == M("fly", 3), M("fly", 3) == M("cep", 3),
         M("cep", 2) == M("cep", 0), M("cep", 0) == M("cep", 2)),
        (True, False, False, False, False),
        "mushrooms that match by value, then ones that differ in the name or the spots",
    )
