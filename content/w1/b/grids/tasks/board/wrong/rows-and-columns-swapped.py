def make_board(rows, cols):
    board = []
    for _ in range(cols):
        board.append(["."] * rows)
    return board
