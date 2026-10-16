def test_middle():
    expect_equal(learner["column"]([[1, 2, 3], [4, 5, 6]], 1), [2, 5], "column([[1, 2, 3], [4, 5, 6]], 1)")

def test_first():
    expect_equal(learner["column"]([["a"], ["b"]], 0), ["a", "b"], 'column([["a"], ["b"]], 0)')
