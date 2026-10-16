def test_repeats():
    expect_equal(learner["unique_sorted"]([3, 1, 3, 2]), [1, 2, 3], "unique_sorted([3, 1, 3, 2])")

def test_empty():
    expect_equal(learner["unique_sorted"]([]), [], "unique_sorted([])")
