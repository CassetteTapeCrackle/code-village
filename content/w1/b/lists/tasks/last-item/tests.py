def test_numbers():
    expect_equal(learner["last_item"]([4, 8, 15]), 15, "last_item([4, 8, 15])")

def test_one_value():
    expect_equal(learner["last_item"](["only"]), "only", 'last_item(["only"])')
