def test_three():
    with open("peaks.txt", "w") as f:
        f.write("one\ntwo\nthree\n")
    expect_equal(learner["count_lines"]("peaks.txt"), 3, "count_lines on a file of 3 lines")

def test_empty():
    open("blank.txt", "w").close()
    expect_equal(learner["count_lines"]("blank.txt"), 0, "count_lines on an empty file")
