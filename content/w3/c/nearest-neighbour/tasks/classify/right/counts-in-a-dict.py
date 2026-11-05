import math


def vote(known, point):
    ranked = sorted(known, key=lambda pair: math.dist(pair[0], point))
    counts = {}
    for p, label in ranked[:3]:
        counts[label] = counts.get(label, 0) + 1
    best = None
    for label in counts:
        if best is None or counts[label] > counts[best]:
            best = label
    return best
