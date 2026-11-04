import numpy as np


def typical_price(prices):
    return float(np.percentile(prices, 50))
