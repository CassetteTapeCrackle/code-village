def rank(sorted_times, time):
    faster = 0
    for t in sorted_times:
        if t < time:
            faster += 1
    return faster
