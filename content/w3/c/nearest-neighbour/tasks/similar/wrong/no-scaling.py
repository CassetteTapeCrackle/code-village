import math


def most_similar(animals, mystery):
    best = min(animals, key=lambda a: math.dist((a[1], a[2]), mystery))
    return best[0]
