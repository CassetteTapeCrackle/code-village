def parse_age(text):
    try:
        value = int(text)
    except ValueError:
        return None
    return value
