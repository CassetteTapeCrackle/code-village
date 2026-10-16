def test_scores():
    learner["save_scores"]("s.txt", [4, 8, 15])
    with open("s.txt") as f:
        expect_equal(f.read(), "4\n8\n15\n", "the file after save_scores([4, 8, 15])")
