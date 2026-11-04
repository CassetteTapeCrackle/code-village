def test_age():
    expect_equal(learner["Ranger"]("Noa", 30).age, 30, 'Ranger("Noa", 30).age')

def test_negative():
    """a negative age raises ValueError"""
    try:
        learner["Ranger"]("Sam", -1)
    except ValueError:
        return
    raise Failure('Ranger("Sam", -1) should raise ValueError')

def test_keeps_its_name():
    expect_equal(learner["Ranger"]("Noa", 30).name, "Noa", 'Ranger("Noa", 30).name')

def test_zero_is_allowed():
    expect_equal(learner["Ranger"]("Noa", 0).age, 0, 'Ranger("Noa", 0).age')
