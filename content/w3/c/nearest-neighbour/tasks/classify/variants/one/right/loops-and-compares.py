import math


def label_of(known, point):
    best = known[0]
    for pair in known:
        if math.dist(pair[0], point) < math.dist(best[0], point):
            best = pair
    return best[1]
