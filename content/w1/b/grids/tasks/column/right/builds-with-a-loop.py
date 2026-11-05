def column(grid, c):
    values = []
    for row in grid:
        values = values + [row[c]]
    return values
