PROGRAM = True

def greeting(answers):
    return (run_program(answers).splitlines() or [""])[-1]

def test_sam():
    expect_equal(greeting(["Sam"]), "Hello, Sam! Welcome to Code Village.")

def test_mika():
    expect_equal(greeting(["Mika"]), "Hello, Mika! Welcome to Code Village.")
