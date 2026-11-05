from dataclasses import dataclass


@dataclass(order=True)
class Score:
    points: int
    name: str


def best(scores):
    return sorted(scores)[-1].name
