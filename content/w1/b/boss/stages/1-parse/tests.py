def test_simple():
    expect_equal(learner["parse_line"]("Noa: 12, 15, 9"), ("Noa", [12, 15, 9]), 'parse_line("Noa: 12, 15, 9")')

def test_one_mark():
    expect_equal(learner["parse_line"]("Sam: 20"), ("Sam", [20]), 'parse_line("Sam: 20")')

def test_no_marks():
    """a student with no marks yet"""
    expect_equal(learner["parse_line"]("Ines:"), ("Ines", []), 'parse_line("Ines:")')
