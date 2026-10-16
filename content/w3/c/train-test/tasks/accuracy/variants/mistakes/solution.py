def mistakes(truth, guesses):
    return [i for i, (t, g) in enumerate(zip(truth, guesses)) if t != g]
