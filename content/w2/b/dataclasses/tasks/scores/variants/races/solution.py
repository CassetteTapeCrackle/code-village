from dataclasses import dataclass


@dataclass(order=True)
class Race:
    time: float
    runner: str


def winner(races):
    return min(races).runner
