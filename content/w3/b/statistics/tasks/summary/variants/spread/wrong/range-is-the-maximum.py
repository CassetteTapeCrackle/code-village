import numpy as np


def spread(values):
    a = np.array(values)
    return {"range": float(a.max()), "std": round(float(np.std(a, ddof=1)), 2)}
