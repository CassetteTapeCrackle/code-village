def parse_price(text):
    try:
        return float(text)
    except ValueError:
        return 0.0
