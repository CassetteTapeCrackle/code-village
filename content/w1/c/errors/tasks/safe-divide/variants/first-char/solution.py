def first_char(text):
    try:
        return text[0]
    except IndexError:
        return None
