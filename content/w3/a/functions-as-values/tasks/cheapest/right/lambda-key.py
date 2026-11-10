def by_price(item):
    return item[1]


def cheapest_first(items):
    return sorted(items, key=lambda item: item[1])
