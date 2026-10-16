import math


def scale(column):
    low, high = min(column), max(column)
    return [(x - low) / (high - low) for x in column]


def most_like(hikes, wanted):
    climbs = scale([h[1] for h in hikes] + [wanted[0]])
    kms = scale([h[2] for h in hikes] + [wanted[1]])
    target = (climbs[-1], kms[-1])
    best = min(range(len(hikes)), key=lambda i: math.dist((climbs[i], kms[i]), target))
    return hikes[best][0]
