PROGRAM = True

def test_four():
    expect_equal((run_program(["4"]).splitlines() or [""])[-1], "Double: 8")

def test_zero():
    expect_equal((run_program(["0"]).splitlines() or [""])[-1], "Double: 0")
