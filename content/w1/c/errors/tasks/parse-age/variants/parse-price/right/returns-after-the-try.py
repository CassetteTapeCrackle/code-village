def parse_price(text):
    try:
        value = float(text)
    except ValueError:
        return None
    return value
