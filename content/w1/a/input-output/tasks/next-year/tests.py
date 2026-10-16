PROGRAM = True

def last_line(answers):
    return (run_program(answers).splitlines() or [""])[-1]

def test_twelve():
    expect_equal(last_line(["12"]), "Next year you will be 13")

def test_baby():
    expect_equal(last_line(["0"]), "Next year you will be 1")
