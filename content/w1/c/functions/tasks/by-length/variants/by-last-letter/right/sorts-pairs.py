def last_letter(word):
    return word[-1]


def sort_by_last(words):
    pairs = []
    i = 0
    for word in words:
        pairs.append((last_letter(word), i, word))
        i = i + 1
    pairs = sorted(pairs)
    result = []
    for pair in pairs:
        result.append(pair[2])
    return result
