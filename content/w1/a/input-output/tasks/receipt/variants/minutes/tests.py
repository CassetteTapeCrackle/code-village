PROGRAM = True

def test_two():
    expect_equal((run_program(["2"]).splitlines() or [""])[-1], "2 hours = 120 minutes")

def test_none():
    expect_equal((run_program(["0"]).splitlines() or [""])[-1], "0 hours = 0 minutes")
