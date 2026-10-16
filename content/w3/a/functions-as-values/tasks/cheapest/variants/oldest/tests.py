def test_sorted():
    people = [("Sam", 30), ("Lou", 72), ("Mika", 9)]
    expect_equal(learner["oldest_first"](people), [("Lou", 72), ("Sam", 30), ("Mika", 9)], "oldest_first(Sam, Lou, Mika)")
