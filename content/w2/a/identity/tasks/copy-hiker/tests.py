def test_new_object():
    h = learner["Hiker"]("Sam", ["rope"])
    c = learner["copy_hiker"](h)
    expect_equal((c is h, c.name, c.pack), (False, "Sam", ["rope"]), "copy_hiker(Hiker(\"Sam\", [\"rope\"]))")

def test_own_pack():
    h = learner["Hiker"]("Sam", ["rope"])
    c = learner["copy_hiker"](h)
    c.pack.append("map")
    expect_equal(h.pack, ["rope"], "the original's pack after packing the copy's")
