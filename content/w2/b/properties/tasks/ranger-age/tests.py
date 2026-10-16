def test_age():
    expect_equal(learner["Ranger"]("Noa", 30).age, 30, 'Ranger("Noa", 30).age')

def test_negative():
    """a negative age raises ValueError"""
    try:
        learner["Ranger"]("Sam", -1)
    except ValueError:
        return
    raise Failure('Ranger("Sam", -1) should raise ValueError')
