def find_all(items, target):
    found = []
    for i in range(len(items)):
        if items[i] == target:
            found.append(i)
    return found
