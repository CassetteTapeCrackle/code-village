import numpy as np


def summary(values):
    return {
        "mean": float(np.mean(values)),
        "median": float(np.max(values)),
        "std": round(float(np.std(values, ddof=0)), 2),
    }
