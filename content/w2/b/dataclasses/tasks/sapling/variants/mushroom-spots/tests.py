def test_spots():
    t = learner["Toadstool"]("red cap")
    t.add_spot()
    t.add_spot()
    expect_equal(t, learner["Toadstool"]("red cap", 2), "a toadstool after two add_spot()")
