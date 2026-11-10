def column_totals(rows):
    totals = []
    for c in range(len(rows[0])):
        total = 0
        for row in rows:
            total = total + row[c]
        totals.append(total)
    return totals
