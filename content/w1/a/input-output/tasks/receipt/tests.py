PROGRAM = True

def last_line(answers):
    return (run_program(answers).splitlines() or [""])[-1]

def test_tea():
    expect_equal(last_line(["tea", "2.5", "3"]), "3 x tea = 7.50")

def test_one_bun():
    expect_equal(last_line(["bun", "1.2", "1"]), "1 x bun = 1.20")
