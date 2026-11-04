import numpy as np


def summary(values):
    return {
        "mean": float(np.array(values).mean()),
        "median": float(np.median(values)),
        "std": round(float(np.std(values, ddof=0)), 2),
    }
