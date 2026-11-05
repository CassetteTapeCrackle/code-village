import json


def best_player(path):
    with open(path) as f:
        data = json.load(f)
    best = 0
    for name in data:
        if data[name] > best:
            best = data[name]
    return best
