def test_values():
    expect_equal(list(learner["evens"](7)), [0, 2, 4, 6], "list(evens(7))")

def test_zero():
    expect_equal(list(learner["evens"](0)), [], "list(evens(0))")

def test_is_a_generator():
    result = learner["evens"](4)
    if not hasattr(result, "__next__"):
        raise Failure("evens(4) should be a generator: use yield instead of building a list")
