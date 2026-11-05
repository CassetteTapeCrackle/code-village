def accuracy(truth, guesses):
    right = 0
    for i in range(len(truth)):
        if truth[i] == guesses[i]:
            right += 1
    return right / len(truth)
