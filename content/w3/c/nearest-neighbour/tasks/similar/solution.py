import math


def scale(column):
    low, high = min(column), max(column)
    return [(x - low) / (high - low) for x in column]


def most_similar(animals, mystery):
    grams = scale([a[1] for a in animals] + [mystery[0]])
    metres = scale([a[2] for a in animals] + [mystery[1]])
    target = (grams[-1], metres[-1])
    best = min(range(len(animals)), key=lambda i: math.dist((grams[i], metres[i]), target))
    return animals[best][0]
