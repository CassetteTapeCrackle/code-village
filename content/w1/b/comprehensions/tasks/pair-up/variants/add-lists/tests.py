def test_uneven():
    expect_equal(learner["add_lists"]([1, 2, 3], [10, 20]), [11, 22, 3], "add_lists([1, 2, 3], [10, 20])")

def test_even():
    expect_equal(learner["add_lists"]([1], [1]), [2], "add_lists([1], [1])")

def test_second_longer():
    expect_equal(learner["add_lists"]([10, 20], [1, 2, 3]), [11, 22, 3], "add_lists([10, 20], [1, 2, 3])")

def test_one_side_much_longer():
    expect_equal([learner["add_lists"]([1, 2, 3], [10]), learner["add_lists"]([10], [1, 2, 3])],
                 [[11, 2, 3], [11, 2, 3]], "add_lists([1, 2, 3], [10]) and add_lists([10], [1, 2, 3])")
