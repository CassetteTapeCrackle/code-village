def unique_sorted(values):
    result = []
    for v in sorted(values):
        if not result or result[-1] != v:
            result.append(v)
    return result
