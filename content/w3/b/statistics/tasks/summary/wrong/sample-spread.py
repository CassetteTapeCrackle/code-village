import numpy as np


def summary(values):
    return {
        "mean": float(np.mean(values)),
        "median": float(np.median(values)),
        "std": round(float(np.std(values, ddof=1)), 2),
    }
