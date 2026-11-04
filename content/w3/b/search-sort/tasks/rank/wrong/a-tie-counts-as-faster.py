import bisect


def rank(sorted_times, time):
    return bisect.bisect_right(sorted_times, time)
