def letter(score):
    if score >= 16:
        grade = "A"
    elif score >= 12:
        grade = "B"
    elif score >= 10:
        grade = "C"
    else:
        grade = "F"
    return grade
