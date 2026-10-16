def test_returns_new_list():
    expect_equal(learner["copy_and_add"]([1, 2], 3), [1, 2, 3], "copy_and_add([1, 2], 3)")

def test_original_unchanged():
    """the original list is not changed"""
    original = [1, 2]
    learner["copy_and_add"](original, 3)
    expect_equal(original, [1, 2])
