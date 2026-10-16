def row_totals(grid):
    totals = []
    for row in grid:
        totals.append(sum(row))
    return totals
