def initials(full_name):
    return "".join(word[0].upper() for word in full_name.split())
