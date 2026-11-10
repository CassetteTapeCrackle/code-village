def mistakes(truth, guesses):
    return [i + 1 for i, (t, g) in enumerate(zip(truth, guesses)) if t != g]
