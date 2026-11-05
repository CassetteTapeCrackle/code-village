def last_letter(word):
    return word[-1]


def sort_by_last(words):
    ordered = sorted(words, key=last_letter)
    backwards = []
    for i in range(len(ordered)):
        backwards.append(ordered[len(ordered) - 1 - i])
    return backwards
