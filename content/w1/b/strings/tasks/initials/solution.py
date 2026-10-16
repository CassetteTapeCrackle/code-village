def initials(full_name):
    result = ""
    for word in full_name.split():
        result = result + word[0].upper()
    return result
