def in_stock(stock, item):
    if item in stock:
        return stock[item]
    return 0
