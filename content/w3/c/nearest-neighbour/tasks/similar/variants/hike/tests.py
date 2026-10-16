HIKES = [("stroll", 50, 3), ("ridge", 900, 12), ("long flat", 200, 25)]

def test_long():
    expect_equal(learner["most_like"](HIKES, (100, 24)), "long flat", "most_like(HIKES, (100 m, 24 km))")
