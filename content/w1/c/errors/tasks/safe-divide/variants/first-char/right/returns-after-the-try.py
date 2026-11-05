def first_char(text):
    try:
        first = text[0]
    except IndexError:
        return None
    return first
