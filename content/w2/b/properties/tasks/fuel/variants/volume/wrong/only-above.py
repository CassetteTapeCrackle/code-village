class Radio:
    def __init__(self, volume):
        self.volume = volume

    @property
    def volume(self):
        return self._volume

    @volume.setter
    def volume(self, value):
        if value > 10:
            raise ValueError("volume must be 0 to 10")
        self._volume = value
