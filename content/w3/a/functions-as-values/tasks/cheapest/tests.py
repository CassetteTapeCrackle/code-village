def test_sorted():
    items = [("rope", 12), ("map", 3), ("lamp", 8)]
    expect_equal(learner["cheapest_first"](items), [("map", 3), ("lamp", 8), ("rope", 12)], "cheapest_first(rope, map, lamp)")

def test_one():
    expect_equal(learner["cheapest_first"]([("tea", 2)]), [("tea", 2)], 'cheapest_first([("tea", 2)])')
