def test_copy():
    b = learner["Basket"]("Lou", ["fig"])
    c = learner["copy_basket"](b)
    c.fruits.append("pear")
    expect_equal((c is b, c.owner, b.fruits), (False, "Lou", ["fig"]), "copy, then add a pear to the copy")
