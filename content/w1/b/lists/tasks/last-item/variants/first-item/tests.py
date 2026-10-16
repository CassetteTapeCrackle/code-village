def test_numbers():
    expect_equal(learner["first_item"]([4, 8, 15]), 4, "first_item([4, 8, 15])")

def test_one_value():
    expect_equal(learner["first_item"](["only"]), "only", 'first_item(["only"])')
