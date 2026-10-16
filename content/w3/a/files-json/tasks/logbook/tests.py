def test_two_entries():
    learner["add_entry"]("log.txt", "saw an eagle")
    learner["add_entry"]("log.txt", "snow at noon")
    with open("log.txt") as f:
        expect_equal(f.read(), "saw an eagle\nsnow at noon\n", "the logbook after two entries")
