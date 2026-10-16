def test_both():
    F = learner["Feather"]
    expect_equal((str(F("blue")), F("red") == F("red"), F("red") == F("blue")), ("a blue feather", True, False), "str and == for feathers")
