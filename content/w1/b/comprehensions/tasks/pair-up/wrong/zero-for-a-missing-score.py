def pair_up(names, scores):
    pairs = []
    for i, name in enumerate(names):
        if i < len(scores):
            pairs.append((name, scores[i]))
        else:
            pairs.append((name, 0))
    return pairs
