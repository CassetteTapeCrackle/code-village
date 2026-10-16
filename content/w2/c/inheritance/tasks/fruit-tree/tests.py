def test_describe():
    expect_equal(learner["FruitTree"]("apple", 4, "apples").describe(), "apple, 4 m, gives apples", 'FruitTree("apple", 4, "apples").describe()')

def test_still_a_tree():
    t = learner["FruitTree"]("plum", 3, "plums")
    expect_equal((isinstance(t, learner["Tree"]), t.kind, t.height), (True, "plum", 3), "a FruitTree is a Tree with kind and height")
