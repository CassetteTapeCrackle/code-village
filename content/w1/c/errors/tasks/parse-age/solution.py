def parse_age(text):
    try:
        return int(text)
    except ValueError:
        return None
