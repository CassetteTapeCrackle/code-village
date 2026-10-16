def test_order():
    T = learner["Tree"]
    got = [t.kind for t in learner["shortest_first"]([T("oak", 20), T("fir", 8), T("ash", 12)])]
    expect_equal(got, ["fir", "ash", "oak"], "shortest_first(oak 20, fir 8, ash 12)")
