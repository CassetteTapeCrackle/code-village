def column_totals(rows):
    return [sum(column) for column in zip(*rows)]
