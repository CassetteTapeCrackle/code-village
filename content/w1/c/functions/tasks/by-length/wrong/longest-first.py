def sort_by_length(words):
    ordered = sorted(words, key=len)
    result = []
    i = len(ordered) - 1
    while i >= 0:
        result.append(ordered[i])
        i = i - 1
    return result
