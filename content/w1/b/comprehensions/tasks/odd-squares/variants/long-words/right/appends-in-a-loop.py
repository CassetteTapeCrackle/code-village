def long_words(words):
    result = []
    for w in words:
        if len(w) > 3:
            result.append(w)
    return result
