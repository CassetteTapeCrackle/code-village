PROGRAM = True

def test_hey():
    expect_equal((run_program(["hey"]).splitlines() or [""])[-1], "hey hey")

def test_ok():
    expect_equal((run_program(["ok"]).splitlines() or [""])[-1], "ok ok")
