def initials(full_name):
    words = full_name.split()
    result = ""
    for i in range(len(words)):
        result = result + words[i][0].upper()
    return result
