def first_char(text):
    try:
        return text[-1]
    except IndexError:
        return None
