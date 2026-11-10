def test_missing_score():
    expect_equal(learner["pair_up"](["Noa", "Ines", "Sam"], [12, 15]), [("Noa", 12), ("Ines", 15), ("Sam", None)],
                 'pair_up(["Noa", "Ines", "Sam"], [12, 15])')

def test_all_scored():
    expect_equal(learner["pair_up"](["Lou"], [9]), [("Lou", 9)], 'pair_up(["Lou"], [9])')

def test_several_missing():
    expect_equal(learner["pair_up"](["Ana", "Bo", "Cy"], [4]), [("Ana", 4), ("Bo", None), ("Cy", None)],
                 'pair_up(["Ana", "Bo", "Cy"], [4])')
