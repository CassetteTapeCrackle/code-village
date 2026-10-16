def test_rank():
    H = learner["Hiker"]
    expect_equal(learner["rank"]([H("Sam", 5), H("Noa", 12), H("Lou", 8)]), ["Noa", "Lou", "Sam"], "rank(Sam 5, Noa 12, Lou 8)")

def test_one():
    expect_equal(learner["rank"]([learner["Hiker"]("Ines", 3)]), ["Ines"], "rank of one hiker")
