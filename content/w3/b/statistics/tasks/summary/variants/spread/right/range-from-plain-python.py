import numpy as np


def spread(values):
    return {"range": float(max(values) - min(values)), "std": round(float(np.std(values, ddof=1)), 2)}
