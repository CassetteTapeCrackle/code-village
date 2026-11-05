def grid_sum(grid):
    total = 0
    for row in grid[:1]:
        for cell in row:
            total = total + cell
    return total
