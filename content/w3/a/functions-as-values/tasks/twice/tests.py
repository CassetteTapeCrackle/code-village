def add_one(n):
    return n + 1

def test_add_one():
    expect_equal(learner["apply_twice"](add_one, 5), 7, "apply_twice(add_one, 5)")

def test_strings():
    expect_equal(learner["apply_twice"](lambda s: s + "!", "go"), "go!!", 'apply_twice(lambda s: s + "!", "go")')

def test_times_three():
    expect_equal(learner["apply_twice"](lambda n: n * 3, 2), 18, "apply_twice(lambda n: n * 3, 2)")
