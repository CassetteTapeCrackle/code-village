def test_all():
    M = learner["Map"]
    m = M("north")
    got = [learner["compare_maps"](m, m), learner["compare_maps"](M("north"), M("north")), learner["compare_maps"](M("north"), M("south"))]
    expect_equal(got, ["same map", "copies", "different"], "the same map, two copies, two regions")

def test_copies_built_separately():
    M = learner["Map"]
    expect_equal(learner["compare_maps"](M("".join(["nor", "th"])), M("north")), "copies", "two Map objects with equal regions built apart")

def test_region_order_does_not_matter():
    M = learner["Map"]
    expect_equal(learner["compare_maps"](M("south"), M("north")), "different", 'Map("south") and Map("north")')

def test_same_means_is_not_equals():
    """compare_maps asks whether the two are the same object, even when == says two objects are equal"""
    class AlwaysEqual:
        def __init__(self, region):
            self.region = region

        def __eq__(self, other):
            return True

    expect_equal(learner["compare_maps"](AlwaysEqual("x"), AlwaysEqual("x")), "copies", "compare_maps of two different objects that == calls equal")
