def numbered(items):
    result = []
    n = 1
    for item in items:
        result.append(str(n) + ". " + item)
        n = n + 1
    return result
