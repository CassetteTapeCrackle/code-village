import bisect


def has_score(scores, s):
    scores = sorted(scores)
    i = bisect.bisect_left(scores, s)
    return i < len(scores) and scores[i] == s
