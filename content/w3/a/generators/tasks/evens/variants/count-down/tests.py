def test_values():
    expect_equal(list(learner["down"](10, 3)), [10, 7, 4, 1], "list(down(10, 3))")

def test_is_a_generator():
    if not hasattr(learner["down"](5, 1), "__next__"):
        raise Failure("down(5, 1) should be a generator: use yield")
