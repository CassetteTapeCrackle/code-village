def diagonal(grid):
    values = []
    i = 0
    while i < len(grid):
        values.append(grid[i][i])
        i = i + 1
    return values
