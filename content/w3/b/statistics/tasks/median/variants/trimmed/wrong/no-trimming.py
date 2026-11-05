def trimmed_mean(values):
    middle = sorted(values)
    return sum(middle) / len(middle)
