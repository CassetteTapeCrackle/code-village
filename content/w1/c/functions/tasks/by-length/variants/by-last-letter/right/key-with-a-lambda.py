def last_letter(word):
    return word[-1]

def sort_by_last(words):
    return sorted(words, key=lambda w: w[-1])
