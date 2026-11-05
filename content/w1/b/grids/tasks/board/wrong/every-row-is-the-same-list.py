def make_board(rows, cols):
    row = ["."] * cols
    board = []
    for _ in range(rows):
        board.append(row)
    return board
