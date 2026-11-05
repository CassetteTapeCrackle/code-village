def last_letter(word):
    return word[-1]


def first_letter(word):
    return word[0]


def sort_by_last(words):
    return sorted(words, key=first_letter)
