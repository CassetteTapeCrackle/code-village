def trimmed_mean(values):
    s = sorted(values)
    return sum(s[1:-1]) / (len(s) - 2)
