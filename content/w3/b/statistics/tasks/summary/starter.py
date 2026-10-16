import numpy as np


def summary(values):
    return {
        "mean": float(np.mean(values)),
        "median": float(np.median(values)),
        "std": ...,
    }
