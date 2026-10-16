import math


def vote(known, point):
    nearest = ...
    labels = [label for p, label in nearest]
    return max(labels, key=labels.count)
