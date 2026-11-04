def row_totals(grid):
    totals = []
    for row in grid[:1]:
        totals.append(sum(row))
    return totals
