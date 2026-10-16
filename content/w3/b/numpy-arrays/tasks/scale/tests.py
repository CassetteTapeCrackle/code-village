def test_scale():
    result = learner["scale"]([1, 2, 5], 3)
    if not hasattr(result, "tolist"):
        raise Failure("scale([1, 2, 5], 3) should return a NumPy array (np.array), not a list")
    expect_equal(result.tolist(), [3, 6, 15], "scale([1, 2, 5], 3).tolist()")

def test_half():
    expect_equal(learner["scale"]([4, 10], 0.5).tolist(), [2.0, 5.0], "scale([4, 10], 0.5).tolist()")
