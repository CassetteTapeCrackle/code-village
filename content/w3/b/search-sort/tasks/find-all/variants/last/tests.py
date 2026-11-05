def test_last():
    expect_equal(learner["last_index"]([3, 1, 3, 2], 3), 2, "last_index([3, 1, 3, 2], 3)")

def test_missing():
    expect_equal(learner["last_index"]([3], 9), -1, "last_index([3], 9)")

def test_larger_items_do_not_count():
    expect_equal(learner["last_index"]([3, 5, 1], 3), 0, "last_index([3, 5, 1], 3)")

def test_target_built_apart():
    expect_equal(learner["last_index"](["elk", "owl", "elk"], "".join(["e", "lk"])), 2, "last_index with a target built apart from the items")
