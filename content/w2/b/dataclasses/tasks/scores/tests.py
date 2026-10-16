def test_sorted():
    S = learner["Score"]
    got = [s.name for s in sorted([S(7, "Sam"), S(9, "Noa"), S(7, "Ines")])]
    expect_equal(got, ["Ines", "Sam", "Noa"], "sorted scores (7 Sam, 9 Noa, 7 Ines)")

def test_best():
    S = learner["Score"]
    expect_equal(learner["best"]([S(3, "Lou"), S(8, "Mika")]), "Mika", "best of Lou 3 and Mika 8")
