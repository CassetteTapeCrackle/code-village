def in_both(a, b):
    both = list(set(a))
    result = []
    for x in both:
        if x in b:
            result.append(x)
    result.sort()
    return result
