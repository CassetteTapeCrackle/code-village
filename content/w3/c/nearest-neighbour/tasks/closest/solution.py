import math


def closest(points, target):
    return min(points, key=lambda p: math.dist(p, target))
