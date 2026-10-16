def log(message, entries=None):
    if entries is None:
        entries = []
    entries.append(message)
    return entries
