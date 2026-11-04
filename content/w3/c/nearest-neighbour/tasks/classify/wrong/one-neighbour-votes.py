import math


def vote(known, point):
    nearest = sorted(known, key=lambda pair: math.dist(pair[0], point))[:1]
    labels = [label for p, label in nearest]
    return max(labels, key=labels.count)
