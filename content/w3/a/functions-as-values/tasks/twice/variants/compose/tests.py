def test_str_len():
    expect_equal(learner["compose"](str, len, "moss"), "4", 'compose(str, len, "moss")')

def test_order_matters():
    expect_equal(learner["compose"](lambda n: n + 1, lambda n: n * 10, 2), 21, "compose(add one, times ten, 2)")
