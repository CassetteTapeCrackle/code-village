def test_str():
    expect_equal(str(learner["Badge"]("Sam")), "Badge of Sam", 'str(Badge("Sam"))')

def test_other():
    expect_equal(str(learner["Badge"]("Ines")), "Badge of Ines", 'str(Badge("Ines"))')
