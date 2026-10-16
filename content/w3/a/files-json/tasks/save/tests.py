def test_lines():
    learner["save_lines"]("trail.txt", ["north", "east"])
    with open("trail.txt") as f:
        expect_equal(f.read(), "north\neast\n", 'the file after save_lines("trail.txt", ["north", "east"])')

def test_empty():
    learner["save_lines"]("none.txt", [])
    with open("none.txt") as f:
        expect_equal(f.read(), "", "the file after save_lines with no lines")
