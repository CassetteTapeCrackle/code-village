def pair_up(names, scores):
    padded = scores + [None] * len(names)
    return list(zip(names, padded))
