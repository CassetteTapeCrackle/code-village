def set_volume(level):
    if level > 10:
        raise ValueError("volume must be 0 to 10")
    return level
