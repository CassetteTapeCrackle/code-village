import math


def scale(column):
    low = min(column)
    span = max(column) - low
    return [(x - low) / span for x in column]


def most_like(hikes, wanted):
    first = scale([r[1] for r in hikes] + [wanted[0]])
    second = scale([r[2] for r in hikes] + [wanted[1]])
    best_name = None
    best_gap = None
    for i in range(len(hikes)):
        gap = math.dist((first[i], second[i]), (first[-1], second[-1]))
        if best_gap is None or gap < best_gap:
            best_gap = gap
            best_name = hikes[i][0]
    return best_name
