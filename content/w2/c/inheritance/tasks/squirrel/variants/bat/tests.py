def test_bat():
    b = learner["Bat"]("Echo", 30)
    expect_equal((b.name, b.wingspan), ("Echo", 30), 'Bat("Echo", 30)')
