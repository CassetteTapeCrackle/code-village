def unique_sorted(values):
    unique = set(values)
    result = list(unique)
    result.sort()
    backwards = []
    for v in result:
        backwards = [v] + backwards
    return backwards
