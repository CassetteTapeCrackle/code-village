import math


def label_of(known, point):
    best = min(known, key=lambda pair: math.dist(pair[0], point))
    return best[1]
