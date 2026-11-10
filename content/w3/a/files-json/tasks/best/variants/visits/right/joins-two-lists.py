import json


def sign(path, name):
    with open(path) as f:
        names = json.load(f)
    names = names + [name]
    with open(path, "w") as f:
        json.dump(names, f)
