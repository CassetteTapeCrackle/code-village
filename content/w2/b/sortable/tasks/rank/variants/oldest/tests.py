def test_order():
    T = learner["Tree"]
    expect_equal(learner["oldest_first"]([T("birch", 30), T("yew", 300), T("oak", 120)]), ["yew", "oak", "birch"], "oldest_first(birch, yew, oak)")
