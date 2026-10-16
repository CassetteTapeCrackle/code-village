TEXT = "name,height,team\nNoa,160,red\nSam,172,blue\nLou,155,red"

def test_two():
    expect_equal(learner["count_taller"](TEXT, 158), 2, "count_taller(TEXT, 158)")

def test_none():
    expect_equal(learner["count_taller"](TEXT, 200), 0, "count_taller(TEXT, 200)")
