def diagonal(grid):
    values = []
    for i in range(len(grid)):
        values.append(grid[i][i])
    return values
