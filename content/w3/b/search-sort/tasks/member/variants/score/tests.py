def test_first():
    expect_equal(learner["has_score"]([90, 20, 70, 40], 90), True, "has_score([90, 20, 70, 40], 90)")

def test_missing():
    expect_equal(learner["has_score"]([90, 20, 70, 40], 50), False, "has_score([90, 20, 70, 40], 50)")

def test_every_score_is_found():
    scores = [90, 20, 70, 40, 10, 60, 30]
    expect_equal([learner["has_score"](scores, s) for s in sorted(scores)], [True] * 7, "has_score for each of [90, 20, 70, 40, 10, 60, 30]")

def test_scores_that_are_not_there():
    scores = [90, 20, 70, 40, 10, 60, 30]
    expect_equal([learner["has_score"](scores, s) for s in (0, 15, 55, 100)], [False] * 4,
                 "has_score of 0, 15, 55 and 100 in [90, 20, 70, 40, 10, 60, 30]")

def test_score_built_apart():
    expect_equal(learner["has_score"]([1000, 2000, 3000], int("2000")), True, "has_score([1000, 2000, 3000], 2000) with 2000 built apart")

def test_two_scores():
    expect_equal([learner["has_score"]([65, 15], s) for s in (15, 65)], [True, True], "has_score([65, 15], 15) and has_score([65, 15], 65)")
