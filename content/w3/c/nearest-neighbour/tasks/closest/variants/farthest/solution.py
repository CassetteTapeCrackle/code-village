import math


def farthest(points, target):
    return max(points, key=lambda p: math.dist(p, target))
