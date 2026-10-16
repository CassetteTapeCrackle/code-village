def test_cold():
    expect_equal(learner["can_bake"](learner["Oven"](50)), False, "can_bake(Oven(50))")

def test_hot():
    expect_equal(learner["can_bake"](learner["Oven"](200)), True, "can_bake(Oven(200))")
