from dataclasses import dataclass


@dataclass  # make races sortable by time, then runner
class Race:
    time: float
    runner: str


def winner(races):
    pass
