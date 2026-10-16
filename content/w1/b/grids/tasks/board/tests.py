def test_shape():
    expect_equal(learner["make_board"](2, 3), [[".", ".", "."], [".", ".", "."]], "make_board(2, 3)")

def test_rows_independent():
    """placing an X in one row leaves the other rows alone"""
    board = learner["make_board"](2, 3)
    board[0][0] = "X"
    expect_equal(board[1][0], ".")
