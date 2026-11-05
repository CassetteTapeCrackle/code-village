def test_cold():
    expect_equal(learner["can_bake"](learner["Oven"](50)), False, "can_bake(Oven(50))")

def test_hot():
    expect_equal(learner["can_bake"](learner["Oven"](200)), True, "can_bake(Oven(200))")

def test_edge_of_ready():
    O = learner["Oven"]
    expect_equal((learner["can_bake"](O(179)), learner["can_bake"](O(180))), (False, True), "can_bake(Oven(179)) and can_bake(Oven(180))")
