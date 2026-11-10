def count_items(items):
    if not items:
        return 1
    return 1 + count_items(items[1:])
