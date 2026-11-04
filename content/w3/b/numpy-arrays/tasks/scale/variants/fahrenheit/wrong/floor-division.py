import numpy as np


def to_fahrenheit(celsius):
    return np.array(celsius) * 9 // 5 + 32
