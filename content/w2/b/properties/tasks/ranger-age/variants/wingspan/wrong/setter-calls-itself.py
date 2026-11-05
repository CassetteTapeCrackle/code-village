class Bird:
    def __init__(self, wingspan):
        self.wingspan = wingspan

    @property
    def wingspan(self):
        return self._wingspan

    @wingspan.setter
    def wingspan(self, value):
        if value <= 0:
            raise ValueError("wingspan must be positive")
        self.wingspan = value
