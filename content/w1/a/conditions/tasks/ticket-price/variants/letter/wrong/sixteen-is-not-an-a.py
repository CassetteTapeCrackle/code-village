def letter(score):
    if score > 16:
        return "A"
    if score >= 12:
        return "B"
    if score >= 10:
        return "C"
    return "F"
