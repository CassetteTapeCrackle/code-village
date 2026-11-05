def grid_sum(grid):
    total = 0
    for row in grid:
        row_total = 0
        for cell in row:
            row_total = row_total + cell
        total = total + row_total
    return total
