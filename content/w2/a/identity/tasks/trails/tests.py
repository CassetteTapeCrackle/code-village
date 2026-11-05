def test_same():
    t = learner["Trail"]("Fern loop")
    expect_equal(learner["compare"](t, t), "same", "compare(t, t)")

def test_twins():
    T = learner["Trail"]
    expect_equal(learner["compare"](T("Fern loop"), T("Fern loop")), "twins", 'two Trail("Fern loop") objects')

def test_different():
    T = learner["Trail"]
    expect_equal(learner["compare"](T("Fern loop"), T("Ridge")), "different", 'Trail("Fern loop") and Trail("Ridge")')

def test_twins_built_separately():
    T = learner["Trail"]
    expect_equal(learner["compare"](T("".join(["Fern ", "loop"])), T("Fern loop")), "twins", "two Trail objects with equal names built apart")

def test_name_order_does_not_matter():
    T = learner["Trail"]
    expect_equal(learner["compare"](T("Ridge"), T("Fern loop")), "different", 'Trail("Ridge") and Trail("Fern loop")')

def test_same_means_is_not_equals():
    """compare asks whether the two are the same object, even when == says two objects are equal"""
    class AlwaysEqual:
        def __init__(self, name):
            self.name = name

        def __eq__(self, other):
            return True

    expect_equal(learner["compare"](AlwaysEqual("x"), AlwaysEqual("x")), "twins", "compare of two different objects that == calls equal")
