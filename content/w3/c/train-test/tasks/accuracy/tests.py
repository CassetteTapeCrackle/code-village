def test_three_of_four():
    expect_equal(learner["accuracy"](["a", "b", "b", "a"], ["a", "b", "a", "a"]), 0.75, "accuracy(4 labels, 3 right)")

def test_perfect():
    expect_equal(learner["accuracy"](["x"], ["x"]), 1.0, 'accuracy(["x"], ["x"])')

def test_none():
    expect_equal(learner["accuracy"](["x", "y"], ["y", "x"]), 0.0, "accuracy(none right)")
