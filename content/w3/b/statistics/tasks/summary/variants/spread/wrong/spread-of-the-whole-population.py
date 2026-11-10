import numpy as np


def spread(values):
    a = np.array(values)
    return {"range": float(a.max() - a.min()), "std": round(float(np.std(a, ddof=0)), 2)}
