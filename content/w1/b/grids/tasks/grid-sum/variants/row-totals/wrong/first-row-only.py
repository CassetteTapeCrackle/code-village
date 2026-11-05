def row_totals(grid):
    totals = []
    for row in grid[:1]:
        total = 0
        for value in row:
            total = total + value
        totals.append(total)
    return totals
