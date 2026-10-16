def test_saturday():
    expect_equal(learner["is_weekend"]("sat"), True, 'is_weekend("sat")')

def test_sunday():
    expect_equal(learner["is_weekend"]("sun"), True, 'is_weekend("sun")')

def test_monday():
    expect_equal(learner["is_weekend"]("mon"), False, 'is_weekend("mon")')
