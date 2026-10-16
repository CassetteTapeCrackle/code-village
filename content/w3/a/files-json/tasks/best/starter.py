import json


def best_player(path):
    with open(path) as f:
        data = ...
    return max(data, key=data.get)
