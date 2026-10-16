PROGRAM = True

def last_line(answers):
    return (run_program(answers).splitlines() or [""])[-1]

def test_sam():
    expect_equal(last_line(["Sam"]), "Hello, Sam!")

def test_mika():
    expect_equal(last_line(["Mika"]), "Hello, Mika!")
