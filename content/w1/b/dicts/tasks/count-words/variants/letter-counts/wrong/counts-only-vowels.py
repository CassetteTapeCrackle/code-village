def letter_counts(word):
    counts = {}
    for letter in word:
        if letter not in "aeiou":
            continue
        counts[letter] = counts.get(letter, 0) + 1
    return counts
