def accuracy(truth, guesses):
    return sum(t == g for t, g in zip(truth, guesses)) / len(truth)
