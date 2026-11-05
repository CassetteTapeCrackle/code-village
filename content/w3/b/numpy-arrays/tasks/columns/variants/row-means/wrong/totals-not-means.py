import numpy as np


def row_means(rows):
    grid = np.array(rows)
    return grid.sum(axis=1).tolist()
