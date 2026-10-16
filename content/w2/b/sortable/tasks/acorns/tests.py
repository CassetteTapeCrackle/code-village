def test_sorted():
    A = learner["Acorn"]
    expect_equal([a.weight for a in sorted([A(5), A(2), A(9)])], [2, 5, 9], "sorted acorns of 5, 2 and 9 grams")

def test_max():
    A = learner["Acorn"]
    expect_equal(max([A(4), A(11), A(7)]).weight, 11, "max of acorns of 4, 11 and 7 grams")
