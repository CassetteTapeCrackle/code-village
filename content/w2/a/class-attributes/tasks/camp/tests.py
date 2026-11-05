def test_own_tents():
    a = learner["Camp"]("North")
    b = learner["Camp"]("South")
    a.add_tent("blue tent")
    expect_equal(b.tents, [], "camp South's tents after adding one to camp North")

def test_adds():
    a = learner["Camp"]("East")
    a.add_tent("red tent")
    expect_equal(a.tents, ["red tent"], "camp East's tents")

def test_keeps_its_name():
    expect_equal(learner["Camp"]("West").name, "West", "camp West's name")
