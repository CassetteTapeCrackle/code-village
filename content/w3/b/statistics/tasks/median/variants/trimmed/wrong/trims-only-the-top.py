def trimmed_mean(values):
    middle = sorted(values)[:-1]
    return sum(middle) / len(middle)
