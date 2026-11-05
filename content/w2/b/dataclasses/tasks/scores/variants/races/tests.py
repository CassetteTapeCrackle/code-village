def test_winner():
    R = learner["Race"]
    expect_equal(learner["winner"]([R(12.5, "Sam"), R(11.9, "Alex"), R(13.0, "Lou")]), "Alex", "winner of three races")

def test_time_comes_before_the_runner():
    R = learner["Race"]
    expect_equal(learner["winner"]([R(12.5, "Alex"), R(11.9, "Sam")]), "Sam", "winner of Alex in 12.5 and Sam in 11.9")
