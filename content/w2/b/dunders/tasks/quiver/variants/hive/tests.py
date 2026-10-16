def test_len():
    expect_equal((len(learner["Hive"](["Bea", "Buzz"])), len(learner["Hive"]([]))), (2, 0), "len of a hive of two, then of an empty hive")
