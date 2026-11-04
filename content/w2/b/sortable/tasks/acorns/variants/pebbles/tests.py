def test_min():
    P = learner["Pebble"]
    expect_equal(min([P(3), P(1), P(6)]).size, 1, "min of pebbles of size 3, 1 and 6")

def test_equal_pebbles_pick_the_first():
    P = learner["Pebble"]
    first, second = P(2), P(2)
    expect_equal(min([first, second]) is first, True, "min of two pebbles of size 2")
