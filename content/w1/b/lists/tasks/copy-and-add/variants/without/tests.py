def test_removes():
    expect_equal(learner["without"]([1, 2, 3], 2), [1, 3], "without([1, 2, 3], 2)")

def test_original_unchanged():
    """the original list is not changed"""
    original = [1, 2, 3]
    learner["without"](original, 2)
    expect_equal(original, [1, 2, 3])

def test_only_the_first_x_goes():
    expect_equal(learner["without"]([1, 2, 1], 1), [2, 1], "without([1, 2, 1], 1)")
