def has_score(scores, s):
    low, high = 0, len(scores) - 1
    while low <= high:
        mid = (low + high) // 2
        if scores[mid] == s:
            return True
        if scores[mid] < s:
            low = mid + 1
        else:
            high = mid - 1
    return False
