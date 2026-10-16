def test_first():
    expect_equal(learner["has_score"]([90, 20, 70, 40], 90), True, "has_score([90, 20, 70, 40], 90)")

def test_missing():
    expect_equal(learner["has_score"]([90, 20, 70, 40], 50), False, "has_score([90, 20, 70, 40], 50)")
