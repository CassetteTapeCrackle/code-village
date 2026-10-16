PROGRAM = True

def test_win():
    expect_equal(run_program(["42", "50", "30", "42"]), "lower\nhigher\nCorrect! Guesses used: 3\n")

def test_bad_input_is_free():
    """an invalid line does not use up a guess"""
    expect_equal(run_program(["10", "x", "", "9", "10"]),
                 "Please type a whole number from 1 to 100.\nPlease type a whole number from 1 to 100.\nhigher\nCorrect! Guesses used: 2\n")

def test_lose():
    expect_equal(run_program(["5", "1", "2", "3", "4", "6"]), "higher\nhigher\nhigher\nhigher\nlower\nOut of guesses. It was 5.\n")
