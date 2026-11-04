from collections import Counter


def count_words(text):
    return dict(Counter(text.split()))
