def test_runs_out():
    r = learner["Radio"](1)
    expect_equal([r.play(), r.play()], ["music", "silence"], "a radio with 1 charge playing twice")
