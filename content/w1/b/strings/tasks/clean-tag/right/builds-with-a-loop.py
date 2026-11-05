def clean_tag(tag):
    words = tag.strip().lower().split(" ")
    clean = ""
    for word in words:
        if clean != "":
            clean = clean + "-"
        clean = clean + word
    return clean
