def sort_by_length(words):
    result = list(words)
    result.sort(key=len)
    return result
