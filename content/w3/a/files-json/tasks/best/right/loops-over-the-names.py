import json


def best_player(path):
    with open(path) as f:
        data = json.load(f)
    best = None
    for name in data:
        if best is None or data[name] > data[best]:
            best = name
    return best
