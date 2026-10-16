import math


def scale(column):
    low, high = min(column), max(column)
    return [(x - low) / (high - low) for x in column]


def most_similar(animals, mystery):
    grams = scale([a[1] for a in animals] + [mystery[0]])
    metres = scale([a[2] for a in animals] + [mystery[1]])
    target = (mystery[0], mystery[1])
    best = min(range(len(animals)), key=lambda i: math.dist((animals[i][1], animals[i][2]), target))
    return animals[best][0]
