def test_last():
    expect_equal(learner["last_index"]([3, 1, 3, 2], 3), 2, "last_index([3, 1, 3, 2], 3)")

def test_missing():
    expect_equal(learner["last_index"]([3], 9), -1, "last_index([3], 9)")
