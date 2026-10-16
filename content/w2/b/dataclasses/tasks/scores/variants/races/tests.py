def test_winner():
    R = learner["Race"]
    expect_equal(learner["winner"]([R(12.5, "Sam"), R(11.9, "Alex"), R(13.0, "Lou")]), "Alex", "winner of three races")
