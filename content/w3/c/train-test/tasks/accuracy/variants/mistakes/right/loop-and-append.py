def mistakes(truth, guesses):
    wrong = []
    for i in range(len(truth)):
        if truth[i] != guesses[i]:
            wrong.append(i)
    return wrong
