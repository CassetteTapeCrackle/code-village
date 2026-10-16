def test_spaces():
    """extra spaces around names and marks"""
    expect_equal(learner["parse_line"]("  Noa :12 ,15  "), ("Noa", [12, 15]), 'parse_line("  Noa :12 ,15  ")')

def test_blank_lines_ignored():
    expect_equal(learner["ranking"](["Sam: 18", "", "   ", "Ines: 10"]), [("Sam", 18.0), ("Ines", 10.0)],
                 'ranking(["Sam: 18", "", "   ", "Ines: 10"])')

def test_input_list_unchanged():
    """ranking does not change the list it is given"""
    lines = ["Sam: 18", "Ines: 10"]
    learner["ranking"](lines)
    expect_equal(lines, ["Sam: 18", "Ines: 10"])
