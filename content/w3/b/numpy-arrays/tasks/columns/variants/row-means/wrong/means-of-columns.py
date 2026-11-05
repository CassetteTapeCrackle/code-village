import numpy as np


def row_means(rows):
    grid = np.array(rows)
    return grid.mean(axis=0).tolist()
