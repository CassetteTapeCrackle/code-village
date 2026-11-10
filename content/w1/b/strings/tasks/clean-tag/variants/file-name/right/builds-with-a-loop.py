def file_name(title):
    words = title.strip().lower().split(" ")
    name = ""
    for word in words:
        if name == "":
            name = word
        else:
            name = name + "_" + word
    return name + ".txt"
