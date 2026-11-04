def add_item(item, items=None):
    if items is None:
        return [item]
    items.append(item)
    return items
