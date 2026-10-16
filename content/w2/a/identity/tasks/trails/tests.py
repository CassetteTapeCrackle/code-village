def test_same():
    t = learner["Trail"]("Fern loop")
    expect_equal(learner["compare"](t, t), "same", "compare(t, t)")

def test_twins():
    T = learner["Trail"]
    expect_equal(learner["compare"](T("Fern loop"), T("Fern loop")), "twins", 'two Trail("Fern loop") objects')

def test_different():
    T = learner["Trail"]
    expect_equal(learner["compare"](T("Fern loop"), T("Ridge")), "different", 'Trail("Fern loop") and Trail("Ridge")')
