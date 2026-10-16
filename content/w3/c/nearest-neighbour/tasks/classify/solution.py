import math


def vote(known, point):
    nearest = sorted(known, key=lambda pair: math.dist(pair[0], point))[:3]
    labels = [label for p, label in nearest]
    return max(labels, key=labels.count)
