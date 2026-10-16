def test_name():
    s = learner["Squirrel"]("Nutkin")
    expect_equal((s.name, s.stash), ("Nutkin", []), 'Squirrel("Nutkin"): name and stash')
