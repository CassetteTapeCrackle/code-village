def unique_sorted(values):
    ordered = list(values)
    ordered.sort()
    result = []
    for v in ordered:
        if v not in result:
            result.append(v)
    return result
