def long_words(words, n):
    return list(filter(lambda w: len(w) > n, words))
