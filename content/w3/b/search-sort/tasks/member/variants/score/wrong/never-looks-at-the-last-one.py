def has_score(scores, s):
    scores = sorted(scores)
    low, high = 0, len(scores) - 2
    while low <= high:
        mid = (low + high) // 2
        if scores[mid] == s:
            return True
        if scores[mid] < s:
            low = mid + 1
        else:
            high = mid - 1
    return False
