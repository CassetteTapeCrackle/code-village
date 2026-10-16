def parse_price(text):
    try:
        return flaot(text)
    except:
        return None
