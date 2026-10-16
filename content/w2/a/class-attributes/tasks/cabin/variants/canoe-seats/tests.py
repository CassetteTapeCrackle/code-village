def test_board():
    c = learner["Canoe"]()
    expect_equal([c.board(p) for p in ["Noa", "Sam", "Lou"]], [True, True, False], "three people into a canoe for two")

def test_shared_capacity():
    expect_equal(learner["Canoe"].capacity, 2, "Canoe.capacity, set on the class")

def test_own_crew():
    a = learner["Canoe"]()
    a.board("Noa")
    expect_equal(learner["Canoe"]().crew, [], "a second canoe's crew")
