def test_cold():
    expect_equal(learner["ready"](learner["Kettle"](20)), False, "ready(Kettle(20))")

def test_hot():
    expect_equal(learner["ready"](learner["Kettle"](95)), True, "ready(Kettle(95))")
