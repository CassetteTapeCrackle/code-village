def count_items(items):
    if len(items) == 0:
        return 0
    return count_items(items[:-1]) + 1
