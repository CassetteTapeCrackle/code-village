from dataclasses import dataclass


@dataclass(order=True)
class Score:
    name: str
    points: int


def best(scores):
    return max(scores).name
