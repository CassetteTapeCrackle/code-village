def count_items(items):
    if not items:
        return 0
    return 1 + count_items(items[1:])
