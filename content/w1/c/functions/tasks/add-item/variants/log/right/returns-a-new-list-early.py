def log(message, entries=None):
    if entries is None:
        return [message]
    entries.append(message)
    return entries
