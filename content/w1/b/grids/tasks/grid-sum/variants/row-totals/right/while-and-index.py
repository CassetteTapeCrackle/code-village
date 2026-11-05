def row_totals(grid):
    totals = []
    for row in grid:
        i = 0
        total = 0
        while i < len(row):
            total = total + row[i]
            i = i + 1
        totals.append(total)
    return totals
