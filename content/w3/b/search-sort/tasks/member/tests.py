def test_first():
    expect_equal(learner["on_list"](["Sam", "Ines", "Noa"], "Sam"), True, 'on_list(["Sam", "Ines", "Noa"], "Sam")')

def test_missing():
    expect_equal(learner["on_list"](["Sam", "Ines", "Noa"], "Lou"), False, 'on_list(["Sam", "Ines", "Noa"], "Lou")')

def test_after_the_last_name():
    expect_equal(learner["on_list"](["Sam", "Ines", "Noa"], "Zed"), False, 'on_list(["Sam", "Ines", "Noa"], "Zed")')

def test_name_built_apart():
    expect_equal(learner["on_list"](["Sam", "Ines", "Noa"], "".join(["S", "am"])), True, "on_list with a name built apart from the list")
