def diagonal(grid):
    values = []
    for i in range(len(grid)):
        values.append(grid[i][len(grid) - 1 - i])
    return values
