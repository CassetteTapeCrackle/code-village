import math


def farthest(points, target):
    return min(points, key=lambda p: math.dist(p, target))
