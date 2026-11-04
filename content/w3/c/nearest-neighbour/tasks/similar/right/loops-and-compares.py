import math


def scale(column):
    low = min(column)
    span = max(column) - low
    return [(x - low) / span for x in column]


def most_similar(animals, mystery):
    first = scale([r[1] for r in animals] + [mystery[0]])
    second = scale([r[2] for r in animals] + [mystery[1]])
    best_name = None
    best_gap = None
    for i in range(len(animals)):
        gap = math.dist((first[i], second[i]), (first[-1], second[-1]))
        if best_gap is None or gap < best_gap:
            best_gap = gap
            best_name = animals[i][0]
    return best_name
