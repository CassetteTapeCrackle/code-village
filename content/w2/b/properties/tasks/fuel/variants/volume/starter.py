class Radio:
    def __init__(self, volume):
        self.volume = volume

    @property
    def volume(self):
        return self._volume

    @volume.setter
    def volume(self, value):
        # refuse values outside 0 to 10 with ValueError
        pass
