def set_volume(level):
    if 0 <= level <= 10:
        return level
    raise ValueError("volume must be 0 to 10")
