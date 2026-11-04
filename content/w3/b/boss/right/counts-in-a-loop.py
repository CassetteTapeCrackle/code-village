import bisect
import numpy as np


def clean(rows):
    seen = set()
    speeds = []
    for row in rows:
        time, value = row.split(",")
        if time in seen:
            continue
        try:
            speed = float(value)
        except ValueError:
            continue
        seen.add(time)
        speeds.append(speed)
    return speeds


def summary(speeds):
    if not speeds:
        return {"count": 0, "mean": None, "median": None, "std": None}
    return {
        "count": len(speeds),
        "mean": round(float(np.mean(speeds)), 2),
        "median": float(np.median(speeds)),
        "std": round(float(np.std(speeds, ddof=0)), 2),
    }


def top(speeds, n):
    return sorted(speeds, reverse=True)[:n]


def count_over(speeds, limit):
    count = 0
    for s in speeds:
        if s > limit:
            count += 1
    return count
