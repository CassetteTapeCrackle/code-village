def test_fresh_each_time():
    learner["log"]("start")
    expect_equal(learner["log"]("stop"), ["stop"], 'log("start"), then log("stop")')

def test_given_list():
    expect_equal(learner["log"]("b", ["a"]), ["a", "b"], 'log("b", ["a"])')
