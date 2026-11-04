import json


def best_player(path):
    with open(path) as f:
        data = json.load(f)
    return max(data.values())
