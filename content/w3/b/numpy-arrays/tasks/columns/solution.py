import numpy as np


def column_totals(rows):
    grid = np.array(rows)
    return grid.sum(axis=0).tolist()
