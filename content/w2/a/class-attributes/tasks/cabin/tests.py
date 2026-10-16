def test_fills_up():
    c = learner["Cabin"]("Pine")
    got = [c.check_in(n) for n in ["Noa", "Sam", "Ines", "Alex", "Mika"]]
    expect_equal(got, [True, True, True, True, False], "five guests into a cabin for four")

def test_shared_capacity():
    C = learner["Cabin"]
    expect_equal((C.capacity, C("Oak").guests), (4, []), "Cabin.capacity and a new cabin's guests")

def test_own_guests():
    a = learner["Cabin"]("A")
    b = learner["Cabin"]("B")
    a.check_in("Lou")
    expect_equal(b.guests, [], "cabin B's guests after Lou checks into cabin A")
