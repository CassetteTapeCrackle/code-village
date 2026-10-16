TEXT = "name,height,team\nNoa,160,red\nSam,172,blue\nLou,155,red"

def test_red():
    expect_equal(learner["names_in"](TEXT, "red"), ["Noa", "Lou"], 'names_in(TEXT, "red")')

def test_nobody():
    expect_equal(learner["names_in"](TEXT, "green"), [], 'names_in(TEXT, "green")')
