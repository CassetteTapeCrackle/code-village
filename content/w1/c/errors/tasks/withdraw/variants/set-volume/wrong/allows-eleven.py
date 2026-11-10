def set_volume(level):
    if level < 0 or level > 11:
        raise ValueError("volume must be 0 to 10")
    return level
