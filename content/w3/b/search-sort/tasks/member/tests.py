def test_first():
    expect_equal(learner["on_list"](["Sam", "Ines", "Noa"], "Sam"), True, 'on_list(["Sam", "Ines", "Noa"], "Sam")')

def test_missing():
    expect_equal(learner["on_list"](["Sam", "Ines", "Noa"], "Lou"), False, 'on_list(["Sam", "Ines", "Noa"], "Lou")')
