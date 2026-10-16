from dataclasses import dataclass


@dataclass  # make scores sortable by points, then name
class Score:
    points: int
    name: str


def best(scores):
    pass
