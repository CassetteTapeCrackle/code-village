import json


def sign(path, name):
    with open(path) as f:
        names = json.load(f)
    names.append(name)
