def make_board(rows, cols):
    board = []
    for _ in range(rows):
        board.append(["."] * cols)
    return board
