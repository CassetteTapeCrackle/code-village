def grid_sum(grid):
    total = 0
    for row in grid:
        for cell in row:
            total = total + cell
    return total
