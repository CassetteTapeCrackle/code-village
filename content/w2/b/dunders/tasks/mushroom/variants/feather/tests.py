def test_both():
    F = learner["Feather"]
    expect_equal((str(F("blue")), F("red") == F("red"), F("red") == F("blue")), ("a blue feather", True, False), "str and == for feathers")

def test_eq_compares_values_both_ways():
    F = learner["Feather"]
    built = F("".join(["bl", "ue"]))
    expect_equal((built == F("blue"), F("red") == F("blue"), F("blue") == F("red")), (True, False, False),
                 "feathers that match by colour, then two different colours both ways")
