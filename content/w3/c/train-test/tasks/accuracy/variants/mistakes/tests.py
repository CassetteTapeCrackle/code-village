def test_mistakes():
    expect_equal(learner["mistakes"](["a", "b", "b", "a"], ["a", "a", "b", "b"]), [1, 3], "mistakes(...)")
