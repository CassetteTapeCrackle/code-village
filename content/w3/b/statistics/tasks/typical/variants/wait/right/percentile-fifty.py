import numpy as np


def typical_wait(minutes):
    return float(np.percentile(minutes, 50))
