import math


def most_like(hikes, wanted):
    best = min(hikes, key=lambda h: math.dist((h[1], h[2]), wanted))
    return best[0]
