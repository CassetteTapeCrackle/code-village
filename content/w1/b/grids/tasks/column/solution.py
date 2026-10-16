def column(grid, c):
    values = []
    for row in grid:
        values.append(row[c])
    return values
