import bisect


def rank(sorted_times, time):
    return bisect.bisect_left(sorted_times, time)
