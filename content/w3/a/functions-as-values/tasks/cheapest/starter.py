def by_price(item):
    return item[1]


def cheapest_first(items):
    return sorted(items, key=by_price(items))
