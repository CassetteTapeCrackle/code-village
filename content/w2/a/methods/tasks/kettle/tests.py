def test_cold():
    expect_equal(learner["ready"](learner["Kettle"](20)), False, "ready(Kettle(20))")

def test_hot():
    expect_equal(learner["ready"](learner["Kettle"](95)), True, "ready(Kettle(95))")

def test_edge_of_hot():
    K = learner["Kettle"]
    expect_equal((learner["ready"](K(89)), learner["ready"](K(90))), (False, True), "ready(Kettle(89)) and ready(Kettle(90))")
