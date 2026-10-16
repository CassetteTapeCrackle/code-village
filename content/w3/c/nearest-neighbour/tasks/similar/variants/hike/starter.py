import math


def scale(column):
    low, high = min(column), max(column)
    return [(x - low) / (high - low) for x in column]


def most_like(hikes, wanted):
    climbs = scale([h[1] for h in hikes] + [wanted[0]])
    kms = scale([h[2] for h in hikes] + [wanted[1]])
    target = (wanted[0], wanted[1])
    best = min(range(len(hikes)), key=lambda i: math.dist((hikes[i][1], hikes[i][2]), target))
    return hikes[best][0]
