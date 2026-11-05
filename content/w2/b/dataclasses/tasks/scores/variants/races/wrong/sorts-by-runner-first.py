from dataclasses import dataclass


@dataclass(order=True)
class Race:
    runner: str
    time: float


def winner(races):
    return min(races).runner
