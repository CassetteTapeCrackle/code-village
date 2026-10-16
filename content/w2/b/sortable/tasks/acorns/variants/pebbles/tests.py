def test_min():
    P = learner["Pebble"]
    expect_equal(min([P(3), P(1), P(6)]).size, 1, "min of pebbles of size 3, 1 and 6")
