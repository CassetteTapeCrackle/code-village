import math


def closest(points, target):
    return max(points, key=lambda p: math.dist(p, target))
