def test_missing_score():
    expect_equal(learner["pair_up"](["Noa", "Ines", "Sam"], [12, 15]), [("Noa", 12), ("Ines", 15), ("Sam", None)],
                 'pair_up(["Noa", "Ines", "Sam"], [12, 15])')

def test_all_scored():
    expect_equal(learner["pair_up"](["Lou"], [9]), [("Lou", 9)], 'pair_up(["Lou"], [9])')
