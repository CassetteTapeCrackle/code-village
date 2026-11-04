def test_age():
    ranger = learner["Ranger"]("Noa", 30)
    expect_equal((ranger.name, ranger.age), ("Noa", 30), 'Ranger("Noa", 30): name and age')
    expect_equal(learner["Ranger"]("Noa", 0).age, 0, 'Ranger("Noa", 0).age')

def test_negative():
    """a negative age raises ValueError"""
    try:
        learner["Ranger"]("Sam", -1)
    except ValueError:
        return
    raise Failure('Ranger("Sam", -1) should raise ValueError')
