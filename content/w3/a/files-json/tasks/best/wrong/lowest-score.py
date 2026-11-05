import json


def best_player(path):
    with open(path) as f:
        data = json.load(f)
    return min(data, key=data.get)
