def count_items(items):
    if not items:
        return 0
    return 2 + count_items(items[1:])
