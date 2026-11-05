def test_odd():
    expect_equal(learner["median"]([3, 1, 2]), 2, "median([3, 1, 2])")

def test_even():
    expect_equal(learner["median"]([4, 1, 3, 2]), 2.5, "median([4, 1, 3, 2])")

def test_one():
    expect_equal(learner["median"]([5]), 5, "median([5])")

def test_longer_lists():
    expect_equal([learner["median"]([5, 1, 4, 2, 3]), learner["median"]([6, 1, 5, 2, 4, 3])], [3, 3.5], "median([5, 1, 4, 2, 3]) and median([6, 1, 5, 2, 4, 3])")
