def test_has_a_pantry():
    c = learner["Cook"]("Lou")
    c.pantry.store("flour")
    expect_equal((c.pantry.shelf, isinstance(c, learner["Pantry"])), (["flour"], False), "a cook with a pantry, not a pantry")
