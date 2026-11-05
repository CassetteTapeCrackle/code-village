import math


def closest(points, target):
    best = points[0]
    for p in points:
        if math.dist(p, target) < math.dist(best, target):
            best = p
    return best
