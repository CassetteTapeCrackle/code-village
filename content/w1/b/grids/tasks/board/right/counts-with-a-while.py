def make_board(rows, cols):
    board = []
    count = 0
    while count < rows:
        board.append(["."] * cols)
        count = count + 1
    return board
