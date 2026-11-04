def test_temps():
    result = learner["to_fahrenheit"]([0, 100, -40])
    if not hasattr(result, "tolist"):
        raise Failure("to_fahrenheit([0, 100, -40]) should return a NumPy array (np.array), not a list")
    expect_equal(result.tolist(), [32.0, 212.0, -40.0], "to_fahrenheit([0, 100, -40]).tolist()")

def test_fraction():
    expect_equal(learner["to_fahrenheit"]([1]).tolist(), [33.8], "to_fahrenheit([1]).tolist()")
