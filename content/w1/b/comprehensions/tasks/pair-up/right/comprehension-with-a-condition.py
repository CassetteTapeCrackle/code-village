def pair_up(names, scores):
    return [(name, scores[i] if i < len(scores) else None) for i, name in enumerate(names)]
