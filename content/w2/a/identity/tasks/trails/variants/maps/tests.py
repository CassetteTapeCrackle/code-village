def test_all():
    M = learner["Map"]
    m = M("north")
    got = [learner["compare_maps"](m, m), learner["compare_maps"](M("north"), M("north")), learner["compare_maps"](M("north"), M("south"))]
    expect_equal(got, ["same map", "copies", "different"], "the same map, two copies, two regions")
